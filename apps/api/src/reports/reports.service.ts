import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeadSource } from '@prisma/client';
import { CacheService } from '../common/services/cache.service';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async getLeadAgingReport() {
    const now = new Date();
    const stageConfigs = await this.prisma.stageConfig.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } });
    const stages = stageConfigs.map((s) => s.name);

    const results = await Promise.all(
      stages.map(async (stage) => {
        const leads = await this.prisma.lead.findMany({
          where: { stage },
          select: { id: true, createdAt: true, lastContactedAt: true, name: true, phone: true, assignedTo: { select: { name: true } } },
        });

        return {
          stage,
          count: leads.length,
          leads: leads.map((l) => ({
            ...l,
            daysInStage: Math.floor((now.getTime() - l.createdAt.getTime()) / 86400000),
            daysSinceContact: l.lastContactedAt ? Math.floor((now.getTime() - l.lastContactedAt.getTime()) / 86400000) : null,
          })),
        };
      }),
    );

    return results;
  }

  async getSourceBreakdown(from?: Date, to?: Date) {
    const cacheKey = `report:sources:${from?.toISOString() ?? ''}:${to?.toISOString() ?? ''}`;
    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const where: any = {};
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

    const sources = Object.values(LeadSource);
    const result = await Promise.all(
      sources.map(async (source) => {
        const [total, closedWon] = await Promise.all([
          this.prisma.lead.count({ where: { ...where, source } }),
          this.prisma.lead.count({ where: { ...where, source, stage: 'CLOSED_WON' } }),
        ]);
        return { source, total, closedWon, conversionRate: total ? ((closedWon / total) * 100).toFixed(1) : '0' };
      }),
    );

    await this.cache.set(cacheKey, result, 300);
    return result;
  }

  async getAgentPerformance(from?: Date, to?: Date) {
    const cacheKey = `report:agents:${from?.toISOString() ?? ''}:${to?.toISOString() ?? ''}`;
    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const where: any = {};
    if (from) where.createdAt = { gte: from };
    if (to) where.createdAt = { ...(where.createdAt || {}), lte: to };

    const users = await this.prisma.user.findMany({
      where: { isActive: true, role: { in: ['SALES_AGENT', 'TELECALLER', 'MANAGER'] } },
      select: { id: true, name: true, role: true },
    });

    const result = await Promise.all(
      users.map(async (u) => {
        const [leadsAssigned, callsMade, closedWon, hotLeads] = await Promise.all([
          this.prisma.lead.count({ where: { assignedToId: u.id, ...where } }),
          this.prisma.callLog.count({ where: { callerId: u.id, ...where } }),
          this.prisma.lead.count({ where: { assignedToId: u.id, stage: 'CLOSED_WON', ...where } }),
          this.prisma.lead.count({ where: { assignedToId: u.id, isHot: true } }),
        ]);
        return { ...u, leadsAssigned, callsMade, closedWon, hotLeads, conversionRate: leadsAssigned ? ((closedWon / leadsAssigned) * 100).toFixed(1) : '0' };
      }),
    );

    await this.cache.set(cacheKey, result, 120);
    return result;
  }

  async getSalesFunnel() {
    const cached = await this.cache.get<any[]>('report:funnel');
    if (cached) return cached;

    const stageConfigs = await this.prisma.stageConfig.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } });
    const result = await Promise.all(
      stageConfigs.map(async (sc) => ({
        stage: sc.name,
        label: sc.label,
        color: sc.color,
        count: await this.prisma.lead.count({ where: { stage: sc.name } }),
      })),
    );

    await this.cache.set('report:funnel', result, 300);
    return result;
  }

  async exportLeadsCsv(filters: any) {
    const leads = await this.prisma.lead.findMany({
      where: filters,
      include: { assignedTo: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'Lead Number,Name,Phone,Email,City,Source,Stage,Hot,Assigned To,Budget,Created At\n';
    const rows = leads.map((l) =>
      [l.leadNumber, l.name, l.phone, l.email || '', l.city || '', l.source, l.stage,
       l.isHot ? 'Yes' : 'No', l.assignedTo?.name || '', l.budget || '', l.createdAt.toISOString().split('T')[0]].join(','),
    );
    return header + rows.join('\n');
  }
}
