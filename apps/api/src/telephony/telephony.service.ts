import { Injectable, Logger } from '@nestjs/common';
import { randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CallType, CallStatus, LeadSource } from '@prisma/client';
import { ensureSystemUser } from '../common/system-user';

/** Credentials as actually used against the Exotel API. */
interface ResolvedExotelConfig {
  apiKey: string;
  apiToken: string;
  sid: string;
  subdomain: string;
  callerId: string;
}

@Injectable()
export class TelephonyService {
  private readonly logger = new Logger(TelephonyService.name);

  constructor(private prisma: PrismaService) {}

  async logCall(data: {
    fromNumber: string; toNumber: string; callType: CallType;
    duration?: number; notes?: string; leadId?: string; callerId?: string;
  }) {
    const lead = data.leadId ? null : await this.prisma.lead.findFirst({ where: { phone: data.toNumber } });

    const call = await this.prisma.callLog.create({
      data: {
        fromNumber: data.fromNumber,
        toNumber: data.toNumber,
        callType: data.callType,
        status: CallStatus.COMPLETED,
        duration: data.duration,
        notes: data.notes,
        leadId: data.leadId || lead?.id,
        callerId: data.callerId,
        startTime: new Date(),
        endTime: new Date(),
      },
    });

    if (call.leadId) {
      await this.prisma.lead.update({
        where: { id: call.leadId },
        data: { lastContactedAt: new Date() },
      });
      await this.prisma.activity.create({
        data: {
          type: 'CALL',
          title: `${data.callType === 'OUTGOING' ? 'Outgoing' : 'Incoming'} call — ${data.duration ? Math.floor(data.duration / 60) + 'm' : 'N/A'}`,
          metadata: { callId: call.id, duration: data.duration, callType: data.callType },
          userId: data.callerId || (await this.prisma.lead.findUnique({ where: { id: call.leadId } }))?.assignedToId || '',
          leadId: call.leadId,
        },
      });
    }

    return call;
  }

  async getCalls(filters: { leadId?: string; callerId?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const where: any = {};
    if (filters.leadId) where.leadId = filters.leadId;
    if (filters.callerId) where.callerId = filters.callerId;

    const [data, total] = await Promise.all([
      this.prisma.callLog.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.callLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Reads credentials from the database first, so the Settings screen's
   * "Save & Activate" actually activates. Env vars remain as a fallback for
   * environments provisioned before the Settings screen existed.
   */
  private async resolveExotelConfig(): Promise<ResolvedExotelConfig | null> {
    const config = await this.prisma.integrationConfig.findUnique({ where: { type: 'EXOTEL' } });
    const meta = (config?.metadata as any) || {};

    const resolved: ResolvedExotelConfig = {
      apiKey: meta.exotelApiKey || process.env.EXOTEL_API_KEY || '',
      apiToken: config?.accessToken || process.env.EXOTEL_TOKEN || '',
      sid: meta.exotelSid || process.env.EXOTEL_SID || '',
      // Exotel accounts are region-pinned: Singapore vs Mumbai clusters.
      subdomain: meta.subdomain || process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com',
      callerId: meta.virtualNumber || meta.exotelPhone || process.env.EXOTEL_VIRTUAL_NUMBER || '',
    };

    if (!resolved.apiKey || !resolved.apiToken || !resolved.sid || !resolved.callerId) return null;
    return resolved;
  }

  /** Exotel uses HTTP Basic with API Key : API Token — the SID is path-only. */
  private exotelAuthHeader(config: ResolvedExotelConfig): string {
    return 'Basic ' + Buffer.from(`${config.apiKey}:${config.apiToken}`).toString('base64');
  }

  private async callbackUrl(path: string): Promise<string> {
    const secret = await this.ensurePassthruSecret();
    const base = (process.env.API_URL || '').replace(/\/$/, '');
    return `${base}/api/v1/telephony/exotel/${path}/${secret}`;
  }

  async clickToCall(leadId: string, agentId: string) {
    const config = await this.resolveExotelConfig();
    if (!config) {
      return {
        message: 'Exotel not configured — add API Key, API Token, SID and ExoPhone in Settings → Telephony',
        stubMode: true,
      };
    }

    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    const agent = await this.prisma.user.findUnique({ where: { id: agentId } });
    if (!lead || !agent) return { error: 'Lead or agent not found' };

    const agentNumber = agent.exotelAgentId || agent.phone;
    if (!agentNumber) {
      return { error: 'Your profile has no phone number — Exotel calls the agent first' };
    }

    const url = `https://${config.subdomain}/v1/Accounts/${config.sid}/Calls/connect.json`;
    const body = new URLSearchParams({
      From: agentNumber,
      To: lead.phone,
      CallerId: config.callerId,
      CallType: 'trans',
      StatusCallback: await this.callbackUrl('passthru'),
      StatusCallbackEvents: 'terminal',
    });

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: this.exotelAuthHeader(config),
        },
        body,
      });
      const json: any = await res.json();

      if (!res.ok || !json?.Call?.Sid) {
        const details = json?.RestException?.Message || `HTTP ${res.status}`;
        this.logger.error(`Exotel connect failed: ${details}`);
        return { error: 'Exotel API error', details };
      }

      // Persist immediately so the StatusCallback updates this row rather than
      // creating a second one, and so an abandoned call is still visible.
      await this.prisma.callLog.create({
        data: {
          exotelCallSid: json.Call.Sid,
          fromNumber: agentNumber,
          toNumber: lead.phone,
          callType: CallType.OUTGOING,
          status: CallStatus.INITIATED,
          leadId: lead.id,
          callerId: agentId,
          startTime: new Date(),
        },
      });

      return { callSid: json.Call.Sid, status: 'initiated' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Exotel connect threw: ${msg}`);
      return { error: 'Exotel API error', details: msg };
    }
  }

  /** Verifies the secret embedded in the webhook path. */
  async verifyPassthruSecret(provided: string): Promise<boolean> {
    const config = await this.prisma.integrationConfig.findUnique({ where: { type: 'EXOTEL' } });
    const secret = (config?.metadata as any)?.passthruSecret;
    if (!secret || !provided) return false;
    const a = Buffer.from(provided);
    const b = Buffer.from(secret);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  async handleExotelPassthru(body: any) {
    const CallSid = body.CallSid;
    if (!CallSid) return { status: 'ignored', reason: 'No CallSid' };

    // Exotel documents ConversationDuration for status callbacks; older
    // integrations and the passthru applet send Duration/DialCallDuration.
    const rawDuration = body.ConversationDuration ?? body.Duration ?? body.DialCallDuration;
    const duration = rawDuration ? parseInt(String(rawDuration), 10) : null;
    const status = this.mapExotelStatus(body.Status ?? body.CallStatus);
    const recordingUrl = body.RecordingUrl || null;

    const existing = await this.prisma.callLog.findUnique({ where: { exotelCallSid: CallSid } });

    if (existing) {
      const call = await this.prisma.callLog.update({
        where: { id: existing.id },
        data: {
          status,
          duration: Number.isFinite(duration as number) ? duration : null,
          recordingUrl,
          endTime: new Date(),
        },
      });
      if (call.leadId) {
        await this.prisma.lead.update({
          where: { id: call.leadId },
          data: { lastContactedAt: new Date() },
        });
      }
      return call;
    }

    const to = body.To ?? body.CallTo ?? '';
    const from = body.From ?? body.CallFrom ?? '';
    const lead = to ? await this.prisma.lead.findFirst({ where: { phone: to } }) : null;

    return this.prisma.callLog.create({
      data: {
        exotelCallSid: CallSid,
        fromNumber: from,
        toNumber: to,
        callType: CallType.OUTGOING,
        status,
        duration: Number.isFinite(duration as number) ? duration : null,
        recordingUrl,
        leadId: lead?.id,
      },
    });
  }

  /**
   * Incoming call to the ExoPhone — this is what turns the IVR number into a
   * lead source rather than just a dialler. An unrecognised caller becomes a
   * new lead; a known caller just gets the call logged against them.
   *
   * Exotel does not publish the Passthru applet's parameter list, so field
   * names are read defensively. Confirm the exact spellings against a real
   * call before relying on any single one.
   */
  async handleIncomingCall(body: any) {
    const callerNumber = String(body.CallFrom ?? body.From ?? '').trim();
    const dialledNumber = String(body.CallTo ?? body.To ?? body.DialWhomNumber ?? '').trim();
    const callSid = body.CallSid || null;

    if (!callerNumber) return { status: 'ignored', reason: 'No caller number' };

    const normalized = callerNumber.replace(/\D/g, '').slice(-10);

    let lead = await this.prisma.lead.findFirst({
      where: { OR: [{ phone: { endsWith: normalized } }, { altPhone: { endsWith: normalized } }] },
      select: { id: true, assignedToId: true },
    });

    let created = false;
    if (!lead) {
      const systemUserId = await ensureSystemUser(this.prisma);
      const leadNumber = `IVR-${Date.now().toString(36).toUpperCase()}`;
      lead = await this.prisma.lead.create({
        data: {
          leadNumber,
          name: `Inbound caller ${normalized}`,
          phone: normalized,
          source: LeadSource.OTHER,
          utmSource: 'exotel-ivr',
          description: dialledNumber ? `Called ExoPhone ${dialledNumber}` : 'Inbound IVR call',
          createdById: systemUserId,
        },
        select: { id: true, assignedToId: true },
      });
      created = true;
      this.logger.log(`IVR lead created for inbound caller ${normalized}`);
    }

    const existing = callSid
      ? await this.prisma.callLog.findUnique({ where: { exotelCallSid: callSid } })
      : null;

    if (!existing) {
      await this.prisma.callLog.create({
        data: {
          exotelCallSid: callSid,
          fromNumber: callerNumber,
          toNumber: dialledNumber,
          callType: CallType.INCOMING,
          status: this.mapExotelStatus(body.CallStatus ?? body.Status),
          leadId: lead.id,
          callerId: lead.assignedToId,
          startTime: new Date(),
        },
      });
    }

    await this.prisma.lead.update({
      where: { id: lead.id },
      data: { lastContactedAt: new Date() },
    });

    return { status: created ? 'lead_created' : 'lead_matched', leadId: lead.id };
  }

  /** Real round-trip against Exotel, so the UI can report honest status. */
  async testConnection() {
    const config = await this.resolveExotelConfig();
    if (!config) {
      return { ok: false, error: 'Missing API Key, API Token, SID or ExoPhone' };
    }

    try {
      const res = await fetch(
        `https://${config.subdomain}/v1/Accounts/${config.sid}/Calls.json?PageSize=1`,
        { headers: { Authorization: this.exotelAuthHeader(config) } },
      );
      if (!res.ok) {
        const text = await res.text();
        return { ok: false, error: `Exotel returned HTTP ${res.status}`, details: text.slice(0, 300) };
      }
      return { ok: true, sid: config.sid, subdomain: config.subdomain, callerId: config.callerId };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async getAnalytics(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const calls = await this.prisma.callLog.findMany({
      where: { createdAt: { gte: since } },
      include: { caller: { select: { id: true, name: true } }, lead: { select: { stage: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // Group by day
    const dayMap = new Map<string, { day: string; date: string; incoming: number; outgoing: number; missed: number; totalDuration: number }>();
    const days_arr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dayMap.set(key, { day: days_arr[d.getDay()], date: key, incoming: 0, outgoing: 0, missed: 0, totalDuration: 0 });
    }
    for (const c of calls) {
      const key = c.createdAt.toISOString().slice(0, 10);
      const entry = dayMap.get(key);
      if (!entry) continue;
      if (c.callType === 'INCOMING') entry.incoming++;
      else entry.outgoing++;
      if (c.status === 'NO_ANSWER' || c.status === 'FAILED') entry.missed++;
      if (c.duration) entry.totalDuration += c.duration;
    }

    // Outcomes
    const statusCounts = new Map<string, number>();
    for (const c of calls) {
      const label = c.status === 'COMPLETED' ? 'Completed' : c.status === 'NO_ANSWER' ? 'No Answer' : c.status === 'BUSY' ? 'Busy' : c.status === 'FAILED' ? 'Failed' : 'Other';
      statusCounts.set(label, (statusCounts.get(label) || 0) + 1);
    }

    // Agents
    const agentMap = new Map<string, { name: string; calls: number; totalDuration: number; connected: number; leadIds: Set<string> }>();
    const wonStages = new Set(['BOOKING_PENDING', 'CLOSED_WON']);
    for (const c of calls) {
      if (!c.callerId || !c.caller) continue;
      if (!agentMap.has(c.callerId)) agentMap.set(c.callerId, { name: c.caller.name, calls: 0, totalDuration: 0, connected: 0, leadIds: new Set() });
      const a = agentMap.get(c.callerId)!;
      a.calls++;
      if (c.duration) a.totalDuration += c.duration;
      if (c.status === 'COMPLETED') a.connected++;
      if (c.leadId && c.lead && wonStages.has(c.lead.stage)) a.leadIds.add(c.leadId);
    }

    return {
      daily: Array.from(dayMap.values()),
      outcomes: Array.from(statusCounts.entries()).map(([name, value]) => ({ name, value })),
      agents: Array.from(agentMap.values()).map(a => ({
        name: a.name,
        calls: a.calls,
        avgDuration: a.calls > 0 ? Math.round(a.totalDuration / a.calls) : 0,
        connected: a.connected,
        deals: a.leadIds.size,
      })).sort((a, b) => b.calls - a.calls),
    };
  }

  async getToppers(period: 'week' | 'month' | 'all' = 'week') {
    const since = new Date();
    if (period === 'week') since.setDate(since.getDate() - 7);
    else if (period === 'month') since.setDate(since.getDate() - 30);
    else since.setFullYear(2000);

    const calls = await this.prisma.callLog.findMany({
      where: { createdAt: { gte: since }, callerId: { not: null } },
      include: { caller: { select: { id: true, name: true } }, lead: { select: { stage: true } } },
    });

    const agentMap = new Map<string, { name: string; calls: number; totalDuration: number; connected: number; wonLeads: Set<string> }>();
    for (const c of calls) {
      if (!c.callerId || !c.caller) continue;
      if (!agentMap.has(c.callerId)) agentMap.set(c.callerId, { name: c.caller.name, calls: 0, totalDuration: 0, connected: 0, wonLeads: new Set() });
      const a = agentMap.get(c.callerId)!;
      a.calls++;
      if (c.duration) a.totalDuration += c.duration;
      if (c.status === 'COMPLETED') a.connected++;
      if (c.leadId && c.lead?.stage === 'CLOSED_WON') a.wonLeads.add(c.leadId);
    }

    const formatDuration = (secs: number) => `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
    const badges = ['🥇', '🥈', '🥉'];

    return Array.from(agentMap.values())
      .map(a => ({
        name: a.name,
        calls: a.calls,
        duration: formatDuration(a.totalDuration),
        connected: a.connected,
        conversions: a.wonLeads.size,
        score: Math.min(100, Math.round(a.calls > 0 ? (a.connected / a.calls) * 50 + a.wonLeads.size * 5 : 0)),
      }))
      .sort((a, b) => b.calls - a.calls)
      .map((a, i) => ({ rank: i + 1, ...a, badge: badges[i] || '⭐' }));
  }

  // ── Config ──────────────────────────────────────────────────────────────

  /** Never returns the API token — the UI only needs to know whether one is set. */
  async getConfig() {
    const config = await this.prisma.integrationConfig.findUnique({ where: { type: 'EXOTEL' } });
    const meta = (config?.metadata as any) || {};
    const resolved = await this.resolveExotelConfig();

    return {
      exotelApiKey: meta.exotelApiKey || '',
      exotelSid: meta.exotelSid || '',
      exotelPhone: meta.exotelPhone || '',
      virtualNumber: meta.virtualNumber || '',
      subdomain: meta.subdomain || 'api.exotel.com',
      hasToken: !!config?.accessToken,
      tokenLast4: config?.accessToken ? config.accessToken.slice(-4) : null,
      connected: !!resolved,
      passthruUrl: config ? await this.callbackUrl('passthru') : null,
      incomingUrl: config ? await this.callbackUrl('incoming') : null,
      updatedAt: config?.updatedAt ?? null,
    };
  }

  async saveConfig(data: {
    exotelApiKey?: string;
    exotelSid?: string;
    exotelToken?: string;
    exotelPhone?: string;
    virtualNumber?: string;
    subdomain?: string;
  }) {
    const existing = await this.prisma.integrationConfig.findUnique({ where: { type: 'EXOTEL' } });
    const current = (existing?.metadata as any) || {};

    const metadata = {
      ...current,
      exotelApiKey: data.exotelApiKey ?? current.exotelApiKey ?? '',
      exotelSid: data.exotelSid ?? current.exotelSid ?? '',
      exotelPhone: data.exotelPhone ?? current.exotelPhone ?? '',
      virtualNumber: data.virtualNumber ?? current.virtualNumber ?? '',
      subdomain: data.subdomain ?? current.subdomain ?? 'api.exotel.com',
      passthruSecret: current.passthruSecret || randomBytes(24).toString('base64url'),
    };

    // An empty token means "leave it alone" — the form shows a masked value,
    // so submitting it unchanged must not wipe the stored credential.
    const accessToken = data.exotelToken?.trim() ? data.exotelToken.trim() : existing?.accessToken;

    await this.prisma.integrationConfig.upsert({
      where: { type: 'EXOTEL' },
      update: { accessToken, metadata },
      create: { type: 'EXOTEL', accessToken, metadata },
    });

    return this.getConfig();
  }

  /** Creates the webhook secret on first use so callback URLs are always valid. */
  private async ensurePassthruSecret(): Promise<string> {
    const existing = await this.prisma.integrationConfig.findUnique({ where: { type: 'EXOTEL' } });
    const current = (existing?.metadata as any) || {};
    if (current.passthruSecret) return current.passthruSecret;

    const secret = randomBytes(24).toString('base64url');
    await this.prisma.integrationConfig.upsert({
      where: { type: 'EXOTEL' },
      update: { metadata: { ...current, passthruSecret: secret } },
      create: { type: 'EXOTEL', metadata: { passthruSecret: secret } },
    });
    return secret;
  }

  private mapExotelStatus(s: string): CallStatus {
    const map: Record<string, CallStatus> = {
      completed: CallStatus.COMPLETED, busy: CallStatus.BUSY,
      'no-answer': CallStatus.NO_ANSWER, failed: CallStatus.FAILED,
      'in-progress': CallStatus.IN_PROGRESS, ringing: CallStatus.RINGING,
    };
    return map[s?.toLowerCase()] || CallStatus.INITIATED;
  }
}
