import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { LeadsService } from '../leads/leads.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { LeadSource, Prisma } from '@prisma/client';
import { ensureSystemUser } from '../common/system-user';
import {
  PORTALS,
  PortalSlug,
  flattenPayload,
  resolveField,
  normalizePhone,
  isValidIndianMobile,
} from './portal-sources';

const DELIVERY_RETENTION_DAYS = 30;

export interface DeliveryOutcome {
  status: 'created' | 'duplicate' | 'rejected' | 'error';
  leadId?: string;
  reason?: string;
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private leads: LeadsService,
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  // ── Inbound: portals (Housing.com, 99acres, MagicBricks, Webflow) ─────────

  /**
   * Maps a portal payload onto a lead DTO. Pure — no writes — so the same code
   * path serves both the live webhook and the admin "Test" dry run.
   */
  mapPortalPayload(slug: PortalSlug, payload: unknown, fieldMap?: Record<string, string> | null) {
    const portal = PORTALS[slug];
    const flat = flattenPayload(payload);

    const mapped: Record<string, string> = {};
    for (const [crmField, candidates] of Object.entries(portal.fieldCandidates)) {
      mapped[crmField] = resolveField(flat, crmField, candidates, fieldMap);
    }

    const phone = normalizePhone(mapped.phone || '');

    return {
      dto: {
        name: mapped.name || `${portal.label} Lead`,
        phone,
        email: mapped.email || undefined,
        city: mapped.city || undefined,
        projectInterest: mapped.projectInterest || undefined,
        requirements: mapped.requirements || undefined,
        source: portal.leadSource,
        utmSource: portal.label,
      },
      phoneValid: isValidIndianMobile(phone),
    };
  }

  async handlePortalLead(slug: PortalSlug, payload: unknown): Promise<DeliveryOutcome> {
    const portal = PORTALS[slug];
    const config = await this.prisma.integrationConfig.findUnique({
      where: { type: portal.configType },
    });
    const fieldMap = (config?.metadata as any)?.fieldMap as Record<string, string> | undefined;

    const { dto, phoneValid } = this.mapPortalPayload(slug, payload, fieldMap);

    // A lead with no usable phone number cannot be worked by a telecalling team.
    if (!phoneValid) {
      const reason = dto.phone
        ? `Unusable phone number: ${dto.phone}`
        : 'No phone number in payload';
      await this.recordDelivery(portal.configType, 'rejected', payload, { error: reason });
      this.logger.warn(`${portal.label} lead rejected — ${reason}`);
      return { status: 'rejected', reason };
    }

    try {
      const lead = await this.leads.create(dto as any, await ensureSystemUser(this.prisma));
      await this.recordDelivery(portal.configType, 'created', payload, { leadId: lead.id });
      this.logger.log(`${portal.label} lead created: ${lead.leadNumber}`);
      return { status: 'created', leadId: lead.id };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await this.recordDelivery(portal.configType, 'error', payload, { error: message });
      this.logger.error(`${portal.label} lead failed: ${message}`);
      return { status: 'error', reason: message };
    }
  }

  // ── Inbound: Facebook Lead Ads ───────────────────────────────────────────

  /**
   * Verifies Facebook's X-Hub-Signature-256 over the raw request bytes.
   * Fails closed: no configured app secret means no accepted deliveries.
   */
  async verifyFacebookSignature(rawBody: Buffer | undefined, header: string | undefined): Promise<boolean> {
    const config = await this.prisma.integrationConfig.findUnique({ where: { type: 'FACEBOOK' } });
    const appSecret = (config?.metadata as any)?.appSecret || process.env.FB_APP_SECRET;

    if (!appSecret) {
      this.logger.error('FB_APP_SECRET not configured — rejecting Facebook webhook');
      return false;
    }
    if (!rawBody || !header?.startsWith('sha256=')) return false;

    const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex');
    return safeCompare(header.slice('sha256='.length), expected);
  }

  async getFacebookVerifyToken(): Promise<string | null> {
    const config = await this.prisma.integrationConfig.findUnique({ where: { type: 'FACEBOOK' } });
    return (config?.metadata as any)?.verifyToken || process.env.FB_VERIFY_TOKEN || null;
  }

  async handleFacebookLead(payload: any): Promise<DeliveryOutcome> {
    const value = payload?.entry?.[0]?.changes?.[0]?.value;
    if (!value?.leadgen_id) {
      await this.recordDelivery('FACEBOOK', 'rejected', payload, { error: 'No leadgen_id in payload' });
      return { status: 'rejected', reason: 'No leadgen_id in payload' };
    }

    const leadgenId = String(value.leadgen_id);

    // Facebook retries deliveries; short-circuit before spending a Graph API call.
    const existing = await this.prisma.lead.findUnique({
      where: { facebookLeadId: leadgenId },
      select: { id: true },
    });
    if (existing) {
      await this.recordDelivery('FACEBOOK', 'duplicate', payload, { leadId: existing.id });
      return { status: 'duplicate', leadId: existing.id };
    }

    const config = await this.prisma.integrationConfig.findFirst({ where: { type: 'FACEBOOK' } });
    const accessToken = config?.accessToken || process.env.FB_PAGE_ACCESS_TOKEN;
    if (!accessToken) {
      const reason = 'Facebook page access token not configured';
      await this.recordDelivery('FACEBOOK', 'error', payload, { error: reason });
      this.logger.warn(reason);
      return { status: 'error', reason };
    }

    let fields: Record<string, string>;
    try {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/${encodeURIComponent(leadgenId)}?access_token=${encodeURIComponent(accessToken)}`,
      );
      const leadData: any = await response.json();
      if (!response.ok || leadData.error) {
        const reason = leadData?.error?.message || `Graph API HTTP ${response.status}`;
        await this.recordDelivery('FACEBOOK', 'error', payload, { error: reason });
        this.logger.error(`FB Graph API error: ${reason}`);
        return { status: 'error', reason };
      }

      fields = {};
      for (const f of leadData.field_data || []) {
        fields[f.name] = f.values?.[0] || '';
      }
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : String(err);
      await this.recordDelivery('FACEBOOK', 'error', payload, { error: reason });
      return { status: 'error', reason };
    }

    const phone = normalizePhone(fields['phone_number'] || fields['phone'] || '');
    if (!isValidIndianMobile(phone)) {
      const reason = phone ? `Unusable phone number: ${phone}` : 'No phone number on Facebook lead';
      await this.recordDelivery('FACEBOOK', 'rejected', payload, { error: reason });
      return { status: 'rejected', reason };
    }

    const dto = {
      name: fields['full_name'] || fields['name'] || 'Facebook Lead',
      phone,
      email: fields['email'] || undefined,
      source: LeadSource.FACEBOOK,
      facebookLeadId: leadgenId,
      facebookFormId: value.form_id,
      facebookAdId: value.ad_id,
      facebookCampaignId: value.campaign_id,
      city: fields['city'] || fields['location'] || undefined,
      projectInterest: fields['project'] || fields['interested_in'] || undefined,
      utmSource: 'Facebook Lead Ads',
    };

    try {
      const lead = await this.leads.create(dto as any, await ensureSystemUser(this.prisma));
      await this.recordDelivery('FACEBOOK', 'created', payload, { leadId: lead.id });
      this.logger.log(`Facebook lead created: ${lead.leadNumber}`);
      return { status: 'created', leadId: lead.id };
    } catch (err: unknown) {
      // Concurrent retries can both pass the pre-check above and race here.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        await this.recordDelivery('FACEBOOK', 'duplicate', payload, {});
        return { status: 'duplicate' };
      }
      const reason = err instanceof Error ? err.message : String(err);
      await this.recordDelivery('FACEBOOK', 'error', payload, { error: reason });
      this.logger.error(`Facebook lead failed: ${reason}`);
      return { status: 'error', reason };
    }
  }

  // ── Secrets ──────────────────────────────────────────────────────────────

  async verifyWebhookSecret(configType: string, provided: string | undefined): Promise<boolean> {
    const config = await this.prisma.integrationConfig.findUnique({ where: { type: configType } });
    const secret = (config?.metadata as any)?.webhookSecret;

    const reason = !provided
      ? 'No token supplied'
      : !secret
        ? 'No webhook secret configured for this source'
        : safeCompare(provided, secret)
          ? null
          : 'Token does not match';

    if (reason) {
      // Logged so "they say they are sending leads but nothing arrives" is
      // diagnosable — a stale token looks identical to silence otherwise.
      this.logger.warn(`${configType} webhook rejected — ${reason}`);
      await this.recordDelivery(configType, 'rejected', { unauthorized: true }, { error: reason });
      return false;
    }

    return true;
  }

  /**
   * The backend owns webhook URL construction, so what an admin sees on screen
   * is byte-identical to what gets emailed to the portal. Returns null until a
   * secret exists — a URL without one would silently 401 forever.
   */
  async getWebhookUrl(configType: string): Promise<string | null> {
    const portal = Object.entries(PORTALS).find(([, p]) => p.configType === configType);
    const base = (process.env.API_URL || '').replace(/\/$/, '');
    if (!base) return null;

    if (configType === 'FACEBOOK') return `${base}/api/v1/integrations/facebook`;
    if (!portal) return null;

    const config = await this.prisma.integrationConfig.findUnique({ where: { type: configType } });
    const secret = (config?.metadata as any)?.webhookSecret;
    if (!secret) return null;

    return `${base}/api/v1/integrations/leads/${portal[0]}?token=${secret}`;
  }

  /**
   * Emails the portal's account manager the endpoint and instructions, so the
   * admin never has to copy a secret-bearing URL out into their own mail client.
   * Generates the secret first if one does not exist yet.
   */
  async sendSetupEmail(configType: string, to: string, senderName: string) {
    const portal = Object.values(PORTALS).find((p) => p.configType === configType);
    if (!portal) throw new BadRequestException(`${configType} has no portal webhook to share`);

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      throw new BadRequestException('Enter a valid account manager email address');
    }
    if (!process.env.API_URL) {
      throw new BadRequestException(
        'API_URL is not configured on the server, so the webhook URL cannot be built',
      );
    }

    // Generate on demand: an admin who jumps straight to "email the manager"
    // should not have to know a secret had to be created first.
    const existing = await this.prisma.integrationConfig.findUnique({ where: { type: configType } });
    if (!(existing?.metadata as any)?.webhookSecret) {
      await this.rotateWebhookSecret(configType);
    }

    const webhookUrl = await this.getWebhookUrl(configType);
    if (!webhookUrl) throw new BadRequestException('Could not build the webhook URL');

    const company = await this.prisma.company.findFirst();
    const companyName = company?.name || 'Nidhivan Property Linkers';

    try {
      await this.mail.sendPortalSetupRequest({
        to,
        portalLabel: portal.label,
        webhookUrl,
        companyName,
        senderName,
        replyTo: company?.email || undefined,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Setup email to ${to} failed: ${message}`);
      throw new BadRequestException(`Could not send the email: ${message}`);
    }

    const sentAt = new Date().toISOString();
    await this.upsertIntegrationConfig(configType, {
      metadata: { accountManagerEmail: to, setupEmailSentAt: sentAt },
    });

    this.logger.log(`${portal.label} setup request emailed to ${to}`);
    return { sent: true, to, sentAt };
  }

  /**
   * Round-trips the saved page access token against the Graph API so the UI can
   * say whether Facebook actually accepts it, instead of just "a token is set".
   */
  async verifyFacebookCredentials() {
    const config = await this.prisma.integrationConfig.findUnique({ where: { type: 'FACEBOOK' } });
    const metadata = (config?.metadata as any) || {};
    const accessToken = config?.accessToken || process.env.FB_PAGE_ACCESS_TOKEN;
    const appSecret = metadata.appSecret || process.env.FB_APP_SECRET;
    const verifyToken = metadata.verifyToken || process.env.FB_VERIFY_TOKEN;

    const missing = [
      !accessToken && 'Page access token',
      !appSecret && 'App secret',
      !verifyToken && 'Verify token',
    ].filter(Boolean) as string[];

    if (missing.length) {
      return {
        ok: false,
        error: `Missing: ${missing.join(', ')}`,
        // Called out separately because this one silently rejects every delivery.
        blocksDeliveries: !appSecret,
      };
    }

    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${encodeURIComponent(accessToken!)}`,
      );
      const body: any = await res.json();
      if (!res.ok || body.error) {
        return { ok: false, error: body?.error?.message || `Graph API HTTP ${res.status}` };
      }
      return { ok: true, pageName: body.name, pageId: body.id };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async rotateWebhookSecret(configType: string): Promise<{ webhookSecret: string }> {
    const secret = randomBytes(24).toString('base64url');
    const existing = await this.prisma.integrationConfig.findUnique({ where: { type: configType } });
    const metadata = { ...((existing?.metadata as object) || {}), webhookSecret: secret };

    await this.prisma.integrationConfig.upsert({
      where: { type: configType },
      update: { metadata },
      create: { type: configType, metadata },
    });

    return { webhookSecret: secret };
  }

  // ── Config ───────────────────────────────────────────────────────────────

  /** Never returns the raw access token — the UI only needs to know one exists. */
  async getIntegrationConfig(type: string) {
    const config = await this.prisma.integrationConfig.findUnique({ where: { type } });
    if (!config) return { type, hasToken: false, tokenLast4: null, metadata: {} };

    const metadata = (config.metadata as Record<string, unknown>) || {};
    return {
      type: config.type,
      hasToken: !!config.accessToken,
      tokenLast4: config.accessToken ? config.accessToken.slice(-4) : null,
      metadata,
      updatedAt: config.updatedAt,
    };
  }

  async upsertIntegrationConfig(type: string, data: { accessToken?: string; metadata?: any }) {
    const existing = await this.prisma.integrationConfig.findUnique({ where: { type } });
    // Merge rather than replace, so saving a field map cannot wipe the secret.
    const metadata = data.metadata
      ? { ...((existing?.metadata as object) || {}), ...data.metadata }
      : existing?.metadata || undefined;

    await this.prisma.integrationConfig.upsert({
      where: { type },
      update: { ...(data.accessToken ? { accessToken: data.accessToken } : {}), metadata },
      create: { type, accessToken: data.accessToken, metadata },
    });

    return this.getIntegrationConfig(type);
  }

  // ── Status & delivery log ────────────────────────────────────────────────

  async getStatus() {
    const types = [...Object.values(PORTALS).map((p) => p.configType), 'FACEBOOK'];
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Attribute by utmSource, not source: Webflow leads share LeadSource.WEBSITE
    // with landing-page and public-form leads, so counting by source would
    // credit this card with every website lead in the system.
    const labelByType: Record<string, string> = Object.fromEntries(
      Object.values(PORTALS).map((p) => [p.configType, p.label]),
    );

    const leadFilter = (type: string) =>
      type === 'FACEBOOK'
        ? { OR: [{ utmSource: 'Facebook Lead Ads' }, { source: LeadSource.FACEBOOK }] }
        : { utmSource: labelByType[type] };

    return Promise.all(
      types.map(async (type) => {
        const [config, lastDelivery, lastLead, leadCount30d] = await Promise.all([
          this.prisma.integrationConfig.findUnique({ where: { type } }),
          this.prisma.webhookDelivery.findFirst({
            where: { source: type },
            orderBy: { createdAt: 'desc' },
            select: { status: true, createdAt: true, error: true },
          }),
          this.prisma.lead.findFirst({
            where: leadFilter(type),
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          }),
          this.prisma.lead.count({
            where: { ...leadFilter(type), createdAt: { gte: since } },
          }),
        ]);

        const metadata = (config?.metadata as any) || {};
        return {
          type,
          configured:
            type === 'FACEBOOK'
              ? !!(config?.accessToken || process.env.FB_PAGE_ACCESS_TOKEN)
              : !!metadata.webhookSecret,
          hasSecret: !!metadata.webhookSecret,
          webhookUrl: await this.getWebhookUrl(type),
          accountManagerEmail: metadata.accountManagerEmail ?? null,
          setupEmailSentAt: metadata.setupEmailSentAt ?? null,
          lastLeadAt: lastLead?.createdAt ?? null,
          leadCount30d,
          lastDelivery,
        };
      }),
    );
  }

  async getDeliveries(source?: string, take = 50) {
    return this.prisma.webhookDelivery.findMany({
      where: source ? { source } : undefined,
      orderBy: { createdAt: 'desc' },
      take: Math.min(take, 200),
    });
  }

  private async recordDelivery(
    source: string,
    status: DeliveryOutcome['status'],
    payload: unknown,
    extra: { leadId?: string; error?: string },
  ) {
    try {
      await this.prisma.webhookDelivery.create({
        data: {
          source,
          status,
          payload: (payload ?? {}) as Prisma.InputJsonValue,
          leadId: extra.leadId,
          error: extra.error,
        },
      });
      // Opportunistic pruning — cheap enough at ~2% of writes to skip a cron.
      if (Math.random() < 0.02) {
        const cutoff = new Date(Date.now() - DELIVERY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
        await this.prisma.webhookDelivery.deleteMany({ where: { createdAt: { lt: cutoff } } });
      }
    } catch (err: unknown) {
      // Logging a delivery must never break lead capture.
      this.logger.error(`Failed to record ${source} delivery: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

/** Constant-time compare that tolerates length mismatch without throwing. */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
