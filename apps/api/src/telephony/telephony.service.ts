import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CallType, CallStatus } from '@prisma/client';

@Injectable()
export class TelephonyService {
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

  // Exotel stub — activates when EXOTEL_SID + EXOTEL_TOKEN are set
  async clickToCall(leadId: string, agentId: string) {
    const exotelSid = process.env.EXOTEL_SID;
    const exotelToken = process.env.EXOTEL_TOKEN;
    const virtualNumber = process.env.EXOTEL_VIRTUAL_NUMBER;

    if (!exotelSid || !exotelToken || !virtualNumber) {
      return { message: 'Exotel not configured — call will be logged manually', stubMode: true };
    }

    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    const agent = await this.prisma.user.findUnique({ where: { id: agentId } });
    if (!lead || !agent) return { error: 'Lead or agent not found' };

    // Exotel API call (activates when credentials present)
    const url = `https://api.exotel.com/v1/Accounts/${exotelSid}/Calls/connect`;
    const body = new URLSearchParams({
      From: agent.exotelAgentId || agent.phone || '',
      To: lead.phone,
      CallerId: virtualNumber,
      StatusCallback: `${process.env.API_URL}/api/v1/telephony/exotel/passthru`,
    });

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(`${exotelSid}:${exotelToken}`).toString('base64') },
        body,
      });
      const json = await res.json();
      return { callSid: json.Call?.Sid, status: 'initiated' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: 'Exotel API error', details: msg };
    }
  }

  async handleExotelPassthru(body: any) {
    const { CallSid, Status, Duration, RecordingUrl, From, To } = body;
    const existing = await this.prisma.callLog.findUnique({ where: { exotelCallSid: CallSid } });

    if (existing) {
      return this.prisma.callLog.update({
        where: { id: existing.id },
        data: { status: this.mapExotelStatus(Status), duration: Duration ? parseInt(Duration) : null, recordingUrl: RecordingUrl },
      });
    }

    const lead = await this.prisma.lead.findFirst({ where: { phone: To } });
    return this.prisma.callLog.create({
      data: {
        exotelCallSid: CallSid,
        fromNumber: From,
        toNumber: To,
        callType: CallType.OUTGOING,
        status: this.mapExotelStatus(Status),
        duration: Duration ? parseInt(Duration) : null,
        recordingUrl: RecordingUrl,
        leadId: lead?.id,
      },
    });
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

  private mapExotelStatus(s: string): CallStatus {
    const map: Record<string, CallStatus> = {
      completed: CallStatus.COMPLETED, busy: CallStatus.BUSY,
      'no-answer': CallStatus.NO_ANSWER, failed: CallStatus.FAILED,
      'in-progress': CallStatus.IN_PROGRESS, ringing: CallStatus.RINGING,
    };
    return map[s?.toLowerCase()] || CallStatus.INITIATED;
  }
}
