import { Injectable, NotFoundException, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class MarketingService implements OnModuleInit {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  onModuleInit() {
    setInterval(() => this.processNurtureSteps(), 10 * 60 * 1000);
  }

  // ── Segments ──────────────────────────────────────────────────────────────

  async listSegments(userId: string) {
    return this.prisma.segment.findMany({
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { name: true } } },
    });
  }

  async createSegment(data: { name: string; description?: string; filters: any }, userId: string) {
    const count = await this.countLeadsForFilters(data.filters);
    return this.prisma.segment.create({
      data: { ...data, leadCount: count, createdById: userId },
    });
  }

  async previewSegment(id: string) {
    const segment = await this.prisma.segment.findUnique({ where: { id } });
    if (!segment) throw new NotFoundException('Segment not found');
    const where = this.buildLeadWhere(segment.filters as any);
    const [count, sample] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({ where, take: 5, select: { id: true, name: true, phone: true, stage: true } }),
    ]);
    await this.prisma.segment.update({ where: { id }, data: { leadCount: count } });
    return { count, sample };
  }

  async deleteSegment(id: string) {
    await this.prisma.segment.delete({ where: { id } });
    return { ok: true };
  }

  // ── Campaigns ─────────────────────────────────────────────────────────────

  async listCampaigns() {
    return this.prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: { segment: { select: { name: true } }, createdBy: { select: { name: true } } },
    });
  }

  async createCampaign(data: {
    name: string;
    type: string;
    segmentId?: string;
    audienceFilter?: any;
    messageTemplate: string;
    subject?: string;
    scheduledAt?: string;
  }, userId: string) {
    if (!data.segmentId && !data.audienceFilter) {
      throw new BadRequestException('Either segmentId or audienceFilter is required');
    }
    return this.prisma.campaign.create({ data: { ...data, createdById: userId } });
  }

  async launchCampaign(id: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id }, include: { segment: true } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status === 'RUNNING') throw new BadRequestException('Campaign already running');

    const filters = campaign.segment?.filters ?? campaign.audienceFilter ?? {};
    const where = this.buildLeadWhere(filters as any);
    const leads = await this.prisma.lead.findMany({ where, select: { id: true, name: true, phone: true, email: true } });

    await this.prisma.campaign.update({
      where: { id },
      data: { status: 'RUNNING', sentAt: new Date(), totalCount: leads.length },
    });

    await this.prisma.campaignLog.createMany({
      data: leads.map(l => ({
        campaignId: id,
        leadId: l.id,
        contact: campaign.type === 'EMAIL' ? (l.email ?? '') : l.phone,
      })),
      skipDuplicates: true,
    });

    this.processCampaignSends(id, campaign.type, campaign.messageTemplate, campaign.subject ?? undefined, leads).catch((e) => console.error("async", e));
    return { queued: leads.length };
  }

  async pauseCampaign(id: string) {
    return this.prisma.campaign.update({ where: { id }, data: { status: 'PAUSED' } });
  }

  async getCampaignStats(id: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    const logs = await this.prisma.campaignLog.findMany({
      where: { campaignId: id },
      take: 50,
      orderBy: { sentAt: 'desc' },
    });
    return { campaign, logs };
  }

  // ── Attribution ───────────────────────────────────────────────────────────

  async getAttribution() {
    const bySource = await this.prisma.lead.groupBy({
      by: ['source'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
    const converted = await this.prisma.lead.groupBy({
      by: ['source'],
      where: { isConverted: true },
      _count: { id: true },
    });
    const convertedMap = new Map(converted.map(r => [r.source, r._count.id]));
    const byUtm = await this.prisma.lead.groupBy({
      by: ['utmCampaign'],
      where: { utmCampaign: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });
    return {
      bySource: bySource.map(r => ({
        source: r.source,
        total: r._count.id,
        converted: convertedMap.get(r.source) ?? 0,
      })),
      byUtmCampaign: byUtm,
    };
  }

  // ── Nurture Sequences ─────────────────────────────────────────────────────

  async listNurture() {
    return this.prisma.nurtureSequence.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { enrollments: true } } },
    });
  }

  async createNurture(data: { name: string; triggerStage: string; steps: any[] }) {
    return this.prisma.nurtureSequence.create({ data });
  }

  async updateNurture(id: string, data: Partial<{ name: string; isActive: boolean; steps: any[] }>) {
    return this.prisma.nurtureSequence.update({ where: { id }, data });
  }

  async enrollLead(leadId: string, toStage: string) {
    const sequences = await this.prisma.nurtureSequence.findMany({
      where: { triggerStage: toStage, isActive: true },
    });
    for (const seq of sequences) {
      const steps = seq.steps as any[];
      if (!steps.length) continue;
      const firstDelay = steps[0].delayDays ?? 0;
      const nextActionAt = new Date(Date.now() + firstDelay * 86_400_000);
      await this.prisma.nurtureEnrollment.upsert({
        where: { sequenceId_leadId: { sequenceId: seq.id, leadId } },
        create: { sequenceId: seq.id, leadId, nextActionAt },
        update: { status: 'ACTIVE', currentStep: 0, nextActionAt },
      });
    }
  }

  // ── Landing Pages ─────────────────────────────────────────────────────────

  async createLandingPage(data: {
    title: string;
    slug: string;
    projectId: string;
    headTitle?: string;
    headDescription?: string;
    heroHeadline?: string;
    heroSubheadline?: string;
    heroCtaText?: string;
    heroImageUrl?: string;
    sections?: any;
    showGallery?: boolean;
    showAmenities?: boolean;
    showForm?: boolean;
    showMap?: boolean;
  }) {
    const existing = await this.prisma.landingPage.findUnique({ where: { slug: data.slug } });
    if (existing) throw new BadRequestException('Landing page slug already exists');
    return this.prisma.landingPage.create({ data });
  }

  async updateLandingPage(id: string, data: Partial<{
    title: string;
    slug: string;
    isActive: boolean;
    headTitle: string;
    headDescription: string;
    heroHeadline: string;
    heroSubheadline: string;
    heroCtaText: string;
    heroImageUrl: string;
    sections: any;
    showGallery: boolean;
    showAmenities: boolean;
    showForm: boolean;
    showMap: boolean;
  }>) {
    const page = await this.prisma.landingPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Landing page not found');
    if (data.slug && data.slug !== page.slug) {
      const existing = await this.prisma.landingPage.findUnique({ where: { slug: data.slug } });
      if (existing) throw new BadRequestException('Slug already in use');
    }
    return this.prisma.landingPage.update({ where: { id }, data });
  }

  async listLandingPages(projectId?: string) {
    const where = projectId ? { projectId } : {};
    return this.prisma.landingPage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { project: { select: { id: true, name: true, slug: true } } },
    });
  }

  async getLandingPageById(id: string) {
    const page = await this.prisma.landingPage.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!page) throw new NotFoundException('Landing page not found');
    return page;
  }

  async deleteLandingPage(id: string) {
    const page = await this.prisma.landingPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Landing page not found');
    await this.prisma.landingPage.delete({ where: { id } });
    return { ok: true };
  }

  async submitLandingPageLead(slug: string, data: { name: string; phone: string; email?: string; message?: string }) {
    const page = await this.prisma.landingPage.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException('Landing page not found');
    if (!page.isActive) throw new BadRequestException('Landing page is not active');

    const leadNumber = `LP-${Date.now().toString(36).toUpperCase()}`;

    await this.prisma.lead.create({
      data: {
        leadNumber,
        name: data.name,
        phone: data.phone,
        email: data.email,
        description: data.message,
        source: 'WEBSITE',
        landingPageId: page.id,
        landingPage: slug,
        projectInterest: page.projectId,
        createdById: page.projectId,
      },
    });

    await this.prisma.landingPage.update({
      where: { id: page.id },
      data: { leadsGenerated: { increment: 1 } },
    });

    return { success: true, leadNumber };
  }

  // ── Referral Codes ────────────────────────────────────────────────────────

  async createReferralCode(data: {
    code: string;
    projectId: string;
    name?: string;
    phone?: string;
    discountPct?: number;
    discountAmt?: number;
    maxUses?: number;
    createdById: string;
  }) {
    const existing = await this.prisma.referralCode.findUnique({ where: { code: data.code.toUpperCase() } });
    if (existing) throw new BadRequestException('Referral code already exists');
    return this.prisma.referralCode.create({
      data: { ...data, code: data.code.toUpperCase() },
    });
  }

  async listReferralCodes(projectId?: string) {
    const where = projectId ? { projectId } : {};
    return this.prisma.referralCode.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReferralByCode(code: string) {
    const ref = await this.prisma.referralCode.findUnique({ where: { code: code.toUpperCase() } });
    if (!ref) throw new NotFoundException('Referral code not found');
    return ref;
  }

  async incrementReferralUse(code: string) {
    const ref = await this.prisma.referralCode.findUnique({ where: { code: code.toUpperCase() } });
    if (!ref) throw new NotFoundException('Referral code not found');
    if (!ref.isActive) throw new BadRequestException('Referral code is not active');
    if (ref.maxUses > 0 && ref.useCount >= ref.maxUses) {
      throw new BadRequestException('Referral code has reached max uses');
    }
    return this.prisma.referralCode.update({
      where: { id: ref.id },
      data: { useCount: { increment: 1 } },
    });
  }

  async getReferralReport(from?: string, to?: string) {
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const leads = await this.prisma.lead.findMany({
      where: { ...where, referralCode: { not: null } },
      select: { id: true, referralCode: true, isConverted: true, bookingAmount: true, bookingStatus: true },
    });

    const byCode = new Map<string, { leads: number; converted: number; revenue: number }>();
    for (const lead of leads) {
      const key = lead.referralCode!;
      const cur = byCode.get(key) ?? { leads: 0, converted: 0, revenue: 0 };
      cur.leads++;
      if (lead.isConverted) cur.converted++;
      if (lead.bookingAmount) cur.revenue += Number(lead.bookingAmount);
      byCode.set(key, cur);
    }

    const codes = await this.prisma.referralCode.findMany({
      where: { code: { in: Array.from(byCode.keys()) } },
    });
    const codeMap = new Map(codes.map(c => [c.code, c]));

    const breakdown = Array.from(byCode.entries()).map(([code, stats]) => {
      const ref = codeMap.get(code);
      const discountTotal = ref
        ? (ref.discountPct
            ? stats.revenue * (Number(ref.discountPct) / 100)
            : Number(ref.discountAmt ?? 0)) * stats.converted
        : 0;
      return { code, referrer: ref?.name ?? null, ...stats, discountCost: discountTotal };
    });

    const totals = breakdown.reduce(
      (acc, r) => ({ leads: acc.leads + r.leads, converted: acc.converted + r.converted, revenue: acc.revenue + r.revenue, discountCost: acc.discountCost + r.discountCost }),
      { leads: 0, converted: 0, revenue: 0, discountCost: 0 },
    );

    return { breakdown, totals };
  }

  // ── Campaign ROI ──────────────────────────────────────────────────────────

  async getCampaignROI(from?: string, to?: string) {
    const campaigns = await this.prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { logs: true } } },
    });

    const leadWhere: any = {};
    if (from || to) {
      leadWhere.createdAt = {};
      if (from) leadWhere.createdAt.gte = new Date(from);
      if (to) leadWhere.createdAt.lte = new Date(to);
    }

    const results = await Promise.all(
      campaigns.map(async campaign => {
        const leads = await this.prisma.lead.findMany({
          where: { ...leadWhere, campaignName: campaign.name },
          select: { id: true, isConverted: true, bookingAmount: true, bookingStatus: true },
        });

        const totalLeads = leads.length;
        const converted = leads.filter(l => l.isConverted).length;
        const revenue = leads.reduce((sum, l) => sum + Number(l.bookingAmount ?? 0), 0);

        const integrationCost = await this.getIntegrationCost(campaign.name);

        const cost = integrationCost ?? 0;
        const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : null;

        return {
          campaignId: campaign.id,
          campaignName: campaign.name,
          campaignType: campaign.type,
          status: campaign.status,
          cost,
          leads: totalLeads,
          converted,
          revenue,
          roi: roi != null ? Math.round(roi * 100) / 100 : null,
        };
      }),
    );

    return results;
  }

  private async getIntegrationCost(campaignName: string): Promise<number | null> {
    const configs = await this.prisma.integrationConfig.findMany();
    for (const config of configs) {
      const meta = config.metadata as any;
      if (meta?.costs) {
        if (typeof meta.costs === 'object' && meta.costs[campaignName] != null) {
          return Number(meta.costs[campaignName]);
        }
      }
    }
    return null;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private buildLeadWhere(filters: Record<string, any>) {
    const where: any = {};
    if (filters.stage) where.stage = Array.isArray(filters.stage) ? { in: filters.stage } : filters.stage;
    if (filters.source) where.source = Array.isArray(filters.source) ? { in: filters.source } : filters.source;
    if (filters.isHot !== undefined) where.isHot = filters.isHot;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.city) where.city = { contains: filters.city, mode: 'insensitive' };
    if (filters.budgetMin) where.budget = { ...where.budget, gte: filters.budgetMin };
    if (filters.budgetMax) where.budget = { ...where.budget, lte: filters.budgetMax };
    if (filters.tags?.length) where.tags = { hasSome: filters.tags };
    return where;
  }

  private async countLeadsForFilters(filters: any) {
    return this.prisma.lead.count({ where: this.buildLeadWhere(filters) });
  }

  private async processCampaignSends(
    campaignId: string,
    type: string,
    template: string,
    subject: string | undefined,
    leads: Array<{ id: string; name: string; phone: string; email: string | null }>,
  ) {
    let sent = 0;
    let failed = 0;
    const BATCH = 50;

    for (let i = 0; i < leads.length; i += BATCH) {
      const batch = leads.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async lead => {
          const message = template.replace(/{{name}}/g, lead.name).replace(/{{phone}}/g, lead.phone);
          try {
            if (type === 'EMAIL' && lead.email) {
              await this.mail.sendOtp(lead.email, lead.name, message);
            }
            await this.prisma.campaignLog.updateMany({
              where: { campaignId, leadId: lead.id },
              data: { status: 'SENT', sentAt: new Date() },
            });
            sent++;
          } catch (err: any) {
            await this.prisma.campaignLog.updateMany({
              where: { campaignId, leadId: lead.id },
              data: { status: 'FAILED', error: err?.message ?? 'Unknown error' },
            });
            failed++;
          }
        }),
      );
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { sentCount: sent, failedCount: failed },
      });
      if (i + BATCH < leads.length) await new Promise(r => setTimeout(r, 1000));
    }

    const final = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (final?.status === 'RUNNING') {
      await this.prisma.campaign.update({ where: { id: campaignId }, data: { status: 'COMPLETED' } });
    }
  }

  private async processNurtureSteps() {
    const due = await this.prisma.nurtureEnrollment.findMany({
      where: { status: 'ACTIVE', nextActionAt: { lte: new Date() } },
      include: { sequence: true },
    });
    for (const enrollment of due) {
      const steps = enrollment.sequence.steps as any[];
      const step = steps[enrollment.currentStep];
      if (!step) {
        await this.prisma.nurtureEnrollment.update({
          where: { id: enrollment.id },
          data: { status: 'COMPLETED' },
        });
        continue;
      }
      const lead = await this.prisma.lead.findUnique({ where: { id: enrollment.leadId }, select: { name: true, phone: true, email: true } });
      if (!lead) continue;
      const message = (step.template ?? '').replace(/{{name}}/g, lead.name);
      try {
        if (step.type === 'EMAIL' && lead.email) {
          await this.mail.sendOtp(lead.email, lead.name, message);
        }
      } catch (err) {
        this.logger.warn(`Email send failed: ${err}`);
      }
      const nextStep = enrollment.currentStep + 1;
      const nextStepData = steps[nextStep];
      if (nextStepData) {
        const nextActionAt = new Date(Date.now() + (nextStepData.delayDays ?? 1) * 86_400_000);
        await this.prisma.nurtureEnrollment.update({
          where: { id: enrollment.id },
          data: { currentStep: nextStep, nextActionAt },
        });
      } else {
        await this.prisma.nurtureEnrollment.update({
          where: { id: enrollment.id },
          data: { status: 'COMPLETED' },
        });
      }
    }
  }
}
