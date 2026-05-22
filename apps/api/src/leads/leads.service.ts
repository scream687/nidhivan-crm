import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeadSource, Role, User } from '@prisma/client';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto, ChangeStageDto, AssignLeadDto } from './dto/update-lead.dto';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { CacheService } from '../common/services/cache.service';
import { MarketingService } from '../marketing/marketing.service';
import { WorkflowsService } from '../workflows/workflows.service';

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
    private notifications: NotificationsService,
    private cache: CacheService,
    @Inject(forwardRef(() => MarketingService)) private marketing: MarketingService,
    @Inject(forwardRef(() => WorkflowsService)) private workflows: WorkflowsService,
  ) {}

  async create(dto: CreateLeadDto, createdById: string) {
    const duplicate = await this.checkDuplicate(dto.phone, dto.altPhone, dto.email);
    const leadNumber = await this.generateLeadNumber();
    const assignedToId = dto.assignedToId || (await this.getNextRoundRobin());

    const lead = await this.prisma.lead.create({
      data: {
        ...dto,
        leadNumber,
        assignedToId,
        createdById,
        isDuplicate: !!duplicate,
        duplicateOfId: duplicate?.id,
      },
      include: { assignedTo: { select: { id: true, name: true, avatarUrl: true } } },
    });

    await this.prisma.activity.create({
      data: {
        type: 'SYSTEM',
        title: 'Lead created',
        description: `Lead created from ${lead.source}`,
        userId: createdById,
        leadId: lead.id,
      },
    });

    if (assignedToId) {
      await this.prisma.activity.create({
        data: {
          type: 'ASSIGNMENT',
          title: 'Lead assigned',
          metadata: { assignedToId },
          userId: createdById,
          leadId: lead.id,
        },
      });

      // Create notification for the assignee
      await this.notifications.create(
        assignedToId,
        'New Lead Assigned',
        `You have been assigned a new lead: ${lead.name}`,
        'lead_assigned',
        lead.id,
        'Lead',
      );
    }

    // Invalidate KPI + report caches so dashboards reflect the new lead immediately
    await this.cache.delPattern('kpis:*');
    await this.cache.delPattern('report:*');
    await this.cache.del('leaderboard');

    this.gateway.emitToAdmin('lead:created', lead);
    if (lead.assignedToId) {
      this.gateway.emitToUser(lead.assignedToId, 'lead:created', lead);
    }

    this.workflows.fire('LEAD_CREATED', { leadId: lead.id, name: lead.name, assignedToId: lead.assignedToId }).catch(() => {});

    return lead;
  }

  async findAll(user: User, filters: {
    stage?: string; source?: LeadSource; assignedToId?: string;
    isHot?: boolean; search?: string; page?: number; limit?: number;
    sortBy?: string; sortOrder?: 'asc' | 'desc';
    stages?: string[]; city?: string; budgetMin?: number; budgetMax?: number;
    dateFrom?: string; dateTo?: string; tags?: string[];
  }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 200);
    const skip = (page - 1) * limit;

    const where: any = {};

    // Row-level scoping for agents/telecallers
    if (user.role === Role.SALES_AGENT || user.role === Role.TELECALLER) {
      where.assignedToId = user.id;
    } else if (filters.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }

    if (filters.stages?.length) {
      where.stage = { in: filters.stages };
    } else if (filters.stage) {
      where.stage = filters.stage;
    }
    if (filters.source) where.source = filters.source;
    if (filters.isHot !== undefined) where.isHot = filters.isHot;
    if (filters.city) where.city = { contains: filters.city, mode: 'insensitive' };
    if (filters.budgetMin !== undefined || filters.budgetMax !== undefined) {
      where.budget = {
        ...(filters.budgetMin !== undefined ? { gte: filters.budgetMin } : {}),
        ...(filters.budgetMax !== undefined ? { lte: filters.budgetMax } : {}),
      };
    }
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {
        ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
        ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
      };
    }
    if (filters.tags?.length) {
      where.tags = { hasSome: filters.tags };
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { leadNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [filters.sortBy || 'createdAt']: filters.sortOrder || 'desc' },
        include: { assignedTo: { select: { id: true, name: true, avatarUrl: true } } },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findKanban(user: User) {
    const where: any = {};
    if (user.role === Role.SALES_AGENT || user.role === Role.TELECALLER) {
      where.assignedToId = user.id;
    }

    const [leads, stageConfigs] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        include: { assignedTo: { select: { id: true, name: true, avatarUrl: true } } },
      }),
      this.prisma.stageConfig.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } }),
    ]);

    return stageConfigs.map((sc) => ({
      stage: sc.name,
      label: sc.label,
      color: sc.color,
      bgColor: sc.bgColor,
      isWon: sc.isWon,
      isLost: sc.isLost,
      count: leads.filter((l) => l.stage === sc.name).length,
      leads: leads.filter((l) => l.stage === sc.name).slice(0, 50),
    }));
  }

  async findOne(id: string, user: User) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, avatarUrl: true } },
        stageLogs: { include: { changedBy: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
        activities: { include: { user: { select: { id: true, name: true, avatarUrl: true } } }, orderBy: { createdAt: 'desc' } },
        callLogs: { orderBy: { createdAt: 'desc' } },
        tasks: { include: { assignedTo: { select: { id: true, name: true } } }, orderBy: { dueDate: 'asc' } },
        siteVisits: {
          include: {
            assignedTo: { select: { id: true, name: true } },
            conductedBy: { select: { id: true, name: true } },
          },
          orderBy: { scheduledAt: 'desc' },
        },
      },
    });

    if (!lead) throw new NotFoundException('Lead not found');

    if ((user.role === Role.SALES_AGENT || user.role === Role.TELECALLER) && lead.assignedToId !== user.id) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  async update(id: string, dto: UpdateLeadDto, userId: string) {
    const existing = await this.prisma.lead.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Lead not found');

    const updated = await this.prisma.lead.update({
      where: { id },
      data: dto as any,
      include: { assignedTo: { select: { id: true, name: true, avatarUrl: true } } },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entity: 'Lead',
        entityId: id,
        changes: dto as any,
      },
    });

    this.gateway.emitToAdmin('lead:updated', updated);
    if (updated.assignedToId) {
      this.gateway.emitToUser(updated.assignedToId, 'lead:updated', updated);
    }

    return updated;
  }

  async changeStage(id: string, dto: ChangeStageDto, userId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');

    const [updated] = await this.prisma.$transaction([
      this.prisma.lead.update({ where: { id }, data: { stage: dto.stage } }),
      this.prisma.leadStageLog.create({
        data: { leadId: id, fromStage: lead.stage, toStage: dto.stage, changedById: userId, reason: dto.reason },
      }),
      this.prisma.activity.create({
        data: {
          type: 'STAGE_CHANGE',
          title: `Stage changed to ${dto.stage.replace(/_/g, ' ')}`,
          metadata: { from: lead.stage, to: dto.stage, reason: dto.reason },
          userId,
          leadId: id,
        },
      }),
    ]);

    await this.cache.delPattern('kpis:*');
    await this.cache.delPattern('report:*');

    this.gateway.emitToAdmin('lead:stage_changed', { leadId: id, stage: dto.stage, updated });
    if (updated.assignedToId) {
      this.gateway.emitToUser(updated.assignedToId, 'lead:stage_changed', { leadId: id, stage: dto.stage, updated });
    }

    this.marketing.enrollLead(id, dto.stage).catch(() => {});
    this.workflows.fire('STAGE_CHANGED', { leadId: id, stage: dto.stage, name: updated.name, assignedToId: updated.assignedToId }).catch(() => {});

    return updated;
  }

  async assign(id: string, dto: AssignLeadDto, userId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');

    const updated = await this.prisma.lead.update({
      where: { id },
      data: { assignedToId: dto.assignedToId },
      include: { assignedTo: { select: { id: true, name: true, avatarUrl: true } } },
    });

    await this.prisma.activity.create({
      data: {
        type: 'ASSIGNMENT',
        title: 'Lead reassigned',
        metadata: { fromId: lead.assignedToId, toId: dto.assignedToId },
        userId,
        leadId: id,
      },
    });

    // Notify new assignee
    await this.notifications.create(
      dto.assignedToId,
      'Lead Assigned to You',
      `Lead ${lead.leadNumber} (${lead.name}) has been assigned to you.`,
      'lead_assigned',
      id,
      'Lead',
    );

    this.gateway.emitToAdmin('lead:updated', updated);
    if (updated.assignedToId) {
      this.gateway.emitToUser(updated.assignedToId, 'lead:updated', updated);
    }
    // If it was reassigned, notify the previous owner to remove it from their view
    if (lead.assignedToId && lead.assignedToId !== dto.assignedToId) {
      this.gateway.emitToUser(lead.assignedToId, 'lead:removed', { leadId: id });
    }

    return updated;
  }

  async markHot(id: string, isHot: boolean, userId: string) {
    const updated = await this.prisma.lead.update({ where: { id }, data: { isHot } });
    this.gateway.emitToAdmin('lead:updated', updated);
    if (updated.assignedToId) {
      this.gateway.emitToUser(updated.assignedToId, 'lead:updated', updated);
    }
    return updated;
  }

  async getDuplicates() {
    return this.prisma.lead.findMany({
      where: { isDuplicate: true },
      include: { assignedTo: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async mergeLeads(primaryId: string, duplicateId: string, userId: string) {
    const [primary, duplicate] = await Promise.all([
      this.prisma.lead.findUnique({ where: { id: primaryId } }),
      this.prisma.lead.findUnique({ where: { id: duplicateId } }),
    ]);
    if (!primary || !duplicate) throw new NotFoundException('Lead not found');

    await this.prisma.$transaction([
      this.prisma.activity.updateMany({ where: { leadId: duplicateId }, data: { leadId: primaryId } }),
      this.prisma.callLog.updateMany({ where: { leadId: duplicateId }, data: { leadId: primaryId } }),
      this.prisma.task.updateMany({ where: { leadId: duplicateId }, data: { leadId: primaryId } }),
      this.prisma.lead.delete({ where: { id: duplicateId } }),
      this.prisma.activity.create({
        data: {
          type: 'SYSTEM',
          title: `Merged with duplicate lead ${duplicate.leadNumber}`,
          userId,
          leadId: primaryId,
        },
      }),
    ]);

    return this.prisma.lead.findUnique({ where: { id: primaryId } });
  }

  private async checkDuplicate(phone: string, altPhone?: string, email?: string) {
    return this.prisma.lead.findFirst({
      where: {
        OR: [
          { phone },
          ...(altPhone ? [{ phone: altPhone }, { altPhone }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
    });
  }

  private async generateLeadNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.lead.count();
    return `NVP-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  private async getNextRoundRobin(): Promise<string | null> {
    const configs = await this.prisma.roundRobinConfig.findMany({
      where: { isActive: true },
      orderBy: { queueOrder: 'asc' },
    });
    if (!configs.length) return null;

    const current = configs[0];
    const next = configs[1] || configs[0];

    // Rotate: move current to end
    await this.prisma.$transaction([
      this.prisma.roundRobinConfig.update({
        where: { userId: current.userId },
        data: { queueOrder: configs[configs.length - 1].queueOrder + 1 },
      }),
      ...configs.slice(1).map((c, i) =>
        this.prisma.roundRobinConfig.update({ where: { userId: c.userId }, data: { queueOrder: i } }),
      ),
    ]);

    return current.userId;
  }

  exportCsv(leads: any[]): string {
    const HEADERS = [
      'Lead Number', 'Name', 'Phone', 'Alt Phone', 'Email', 'City', 'State',
      'Source', 'Stage', 'Budget', 'Project Interest', 'Requirements', 'Description',
      'Site Location', 'Reference', 'Lead Title', 'Campaign Name', 'Campaign Team',
      'Next Follow-Up At', 'Next Follow-Up Info', 'Site Visit Date', 'Booking Date',
      'Registry Done Date', 'Is Hot', 'Tags', 'Assigned To', 'Created At',
    ];

    const esc = (v: any) => {
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return s.includes(',') || s.includes('\n') || s.includes('"') ? `"${s}"` : s;
    };

    const rows = leads.map((l) => [
      l.leadNumber, l.name, l.phone, l.altPhone, l.email, l.city, l.state,
      l.source, l.stage, l.budget, l.projectInterest, l.requirements, l.description,
      l.siteLocation, l.reference, l.leadTitle, l.campaignName, l.campaignTeam,
      l.nextFollowUpAt ? new Date(l.nextFollowUpAt).toISOString() : '',
      l.nextFollowUpInfo,
      l.siteVisitDate ? new Date(l.siteVisitDate).toISOString() : '',
      l.bookingDate ? new Date(l.bookingDate).toISOString() : '',
      l.registryDoneDate ? new Date(l.registryDoneDate).toISOString() : '',
      l.isHot ? 'Yes' : 'No',
      (l.tags || []).join(';'),
      l.assignedTo?.name || '',
      new Date(l.createdAt).toISOString(),
    ].map(esc).join(','));

    return [HEADERS.join(','), ...rows].join('\n');
  }

  async exportLeads(user: User): Promise<string> {
    const where: any = {};
    if (user.role === Role.SALES_AGENT || user.role === Role.TELECALLER) {
      where.assignedToId = user.id;
    }
    const leads = await this.prisma.lead.findMany({
      where,
      include: { assignedTo: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });
    return this.exportCsv(leads);
  }

  async importLeads(rows: any[], userId: string): Promise<{ created: number; skipped: number; errors: string[] }> {
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        const phone = String(row['Phone'] || row['phone'] || row['Mobile Number'] || row['MOBILE NUMBER'] || '').trim();
        const name  = String(row['Name'] || row['name'] || row['Contact Name'] || row['CONTACT NAME'] || '').trim();
        if (!phone || !name) { skipped++; continue; }

        const existing = await this.prisma.lead.findFirst({ where: { phone } });
        if (existing) { skipped++; continue; }

        const sourceRaw = String(row['Source'] || row['source'] || row['Lead Source'] || 'OTHER').trim().toUpperCase().replace(/\s+/g, '_');
        const validSources = ['FACEBOOK','INSTAGRAM','HOUSING_COM','NINETYNINE_ACRES','BROKER_REFERRAL','WALK_IN','WHATSAPP','WEBSITE','GOOGLE_ADS','OTHER'];
        const source = validSources.includes(sourceRaw) ? sourceRaw : 'OTHER';

        const stageRaw = String(row['Stage'] || row['stage'] || row['Lead Stage'] || row['LEAD STAGE'] || 'NEW').trim().toUpperCase().replace(/\s+/g, '_');
        // Validate stage against DB without using unresolved accessor
        const validStages = await this.prisma.$queryRaw<{name:string}[]>`SELECT name FROM stage_configs WHERE "isActive" = true`;
        const stageNames = validStages.map((s) => s.name);
        const stage = stageNames.includes(stageRaw) ? stageRaw : 'NEW';

        const leadNumber = await this.generateLeadNumber();

        await this.prisma.lead.create({
          data: {
            leadNumber,
            name,
            phone,
            altPhone: row['Alt Phone'] || row['Alternate Number'] || row['altPhone'] || undefined,
            email: row['Email'] || row['email'] || row['Email Address'] || undefined,
            city: row['City'] || row['city'] || undefined,
            source: source as any,
            stage,
            budget: row['Budget'] ? parseFloat(String(row['Budget']).replace(/[^0-9.]/g, '')) || undefined : undefined,
            projectInterest: row['Project Interest'] || row['Project name'] || row['projectInterest'] || undefined,
            requirements: row['Requirements'] || row['requirements'] || undefined,
            description: row['Description'] || row['description'] || undefined,
            siteLocation: row['Site Location'] || row['siteLocation'] || undefined,
            reference: row['Reference'] || row['reference'] || undefined,
            leadTitle: row['Lead Title'] || row['leadTitle'] || undefined,
            campaignName: row['Campaign Name'] || row['campaignName'] || undefined,
            campaignTeam: row['Campaign Team'] || row['campaignTeam'] || undefined,
            nextFollowUpAt: row['Next Follow-Up At'] ? new Date(row['Next Follow-Up At']) : undefined,
            nextFollowUpInfo: row['Next Follow-Up Info'] || row['nextFollowUpInfo'] || undefined,
            tags: row['Tags'] ? String(row['Tags']).split(';').map((t: string) => t.trim()).filter(Boolean) : [],
            createdById: userId,
          },
        });
        created++;
      } catch (e: any) {
        errors.push(`Row ${created + skipped + errors.length + 1}: ${e.message}`);
      }
    }

    // Invalidate caches
    await this.cache.delPattern('kpis:*');
    await this.cache.delPattern('report:*');

    return { created, skipped, errors: errors.slice(0, 20) };
  }

  async getDashboardKpis(user: User) {
    const cacheKey = `kpis:${user.id}`;
    const cached = await this.cache.get<Record<string, number>>(cacheKey);
    if (cached) return cached;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const where: any = {};
    if (user.role === Role.SALES_AGENT || user.role === Role.TELECALLER) {
      where.assignedToId = user.id;
    }

    const [total, leadsToday, hotLeads, pendingFollowUps, closedWon] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.count({ where: { ...where, createdAt: { gte: today } } }),
      this.prisma.lead.count({ where: { ...where, isHot: true } }),
      this.prisma.lead.count({ where: { ...where, nextFollowUpAt: { lte: new Date() } } }),
      this.prisma.lead.count({ where: { ...where, stage: 'CLOSED_WON', convertedAt: { gte: monthStart } } }),
    ]);

    const result = { totalLeads: total, leadsToday, hotLeads, pendingFollowUps, closedThisMonth: closedWon };
    await this.cache.set(cacheKey, result, 30);
    return result;
  }
}
