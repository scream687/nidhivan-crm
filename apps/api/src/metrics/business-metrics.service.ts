import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/services/cache.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { User, Role } from '@prisma/client';

export interface PipelineHealth {
  stuckDeals: number;
  stageAging: { stage: string; label: string; avgDays: number; count: number }[];
  topLostReasons: { reason: string; count: number }[];
  avgDaysPerStage: { stage: string; label: string; avgDays: number }[];
}

export interface DashboardAlert {
  type: 'danger' | 'warning' | 'info';
  title: string;
  description: string;
  count: number;
  link?: string;
}

@Injectable()
export class BusinessMetricsService {
  private readonly logger = new Logger(BusinessMetricsService.name);

  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private gateway: NotificationsGateway,
  ) {}

  async onLeadChanged(): Promise<void> {
    await this.cache.delPattern('kpis:*');
    const kpis = await this.computeKpis();
    this.gateway.emitKpiUpdate(kpis);
  }

  async onBookingChanged(): Promise<void> {
    await this.cache.delPattern('kpis:*');
    const kpis = await this.computeKpis();
    this.gateway.emitKpiUpdate(kpis);
  }

  async onVisitChanged(): Promise<void> {
    await this.cache.delPattern('kpis:*');
    const kpis = await this.computeKpis();
    this.gateway.emitKpiUpdate(kpis);
  }

  async onTaskChanged(): Promise<void> {
    await this.cache.delPattern('kpis:*');
    const kpis = await this.computeKpis();
    this.gateway.emitKpiUpdate(kpis);
  }

  async getDashboardKpis(user: User) {
    const cacheKey = `kpis:${user.id}`;
    const cached = await this.cache.get<Record<string, number>>(cacheKey);
    if (cached) return cached;

    const where: any = {};
    if (user.role === Role.SALES_AGENT || user.role === Role.TELECALLER) {
      where.assignedToId = user.id;
    }

    const result = await this.computeKpis(where);
    await this.cache.set(cacheKey, result, 30);
    return result;
  }

  async getAlerts(): Promise<DashboardAlert[]> {
    const cacheKey = 'dashboard:alerts';
    const cached = await this.cache.get<DashboardAlert[]>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const nonTerminal = { notIn: ['CLOSED_WON', 'CLOSED_LOST', 'DUPLICATE'] };

    const [overdueHot, missedVisits, stalledPipeline, noFollowUp, inactiveAgents] = await Promise.all([
      this.prisma.lead.count({
        where: { isHot: true, nextFollowUpAt: { lte: now }, stage: nonTerminal },
      }),
      this.prisma.siteVisit.count({
        where: { status: 'SCHEDULED', visitDate: { lt: now, gte: today } },
      }),
      this.prisma.lead.count({
        where: {
          stage: nonTerminal,
          updatedAt: { lte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.lead.count({
        where: { nextFollowUpAt: null, stage: nonTerminal, createdAt: { lte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) } },
      }),
      this.prisma.user.count({
        where: {
          role: { in: [Role.SALES_AGENT, Role.TELECALLER] },
          isActive: true,
          assignedLeads: { some: { createdAt: { gte: today } } },
        },
      }),
    ]);

    const totalAgents = await this.prisma.user.count({
      where: { role: { in: [Role.SALES_AGENT, Role.TELECALLER] }, isActive: true },
    });

    const alerts: DashboardAlert[] = [];

    if (overdueHot > 0) {
      alerts.push({ type: 'danger', title: 'Overdue Hot Leads', description: `${overdueHot} hot lead${overdueHot > 1 ? 's have' : ' has'} an overdue follow-up.`, count: overdueHot, link: '/leads?isHot=true&overdue=true' });
    }
    if (missedVisits > 0) {
      alerts.push({ type: 'warning', title: 'Missed Site Visits', description: `${missedVisits} site visit${missedVisits > 1 ? 's' : ''} scheduled today ${missedVisits > 1 ? 'are' : 'is'} past due.`, count: missedVisits, link: '/reports/site-visits' });
    }
    if (stalledPipeline > 0) {
      alerts.push({ type: 'warning', title: 'Pipeline Stalled', description: `${stalledPipeline} lead${stalledPipeline > 1 ? 's' : ''} haven't changed stage in 14+ days.`, count: stalledPipeline, link: '/leads' });
    }
    if (noFollowUp > 0) {
      alerts.push({ type: 'info', title: 'Leads Without Follow-up', description: `${noFollowUp} lead${noFollowUp > 1 ? 's' : ''} created 3+ days ago with no follow-up scheduled.`, count: noFollowUp });
    }
    if (inactiveAgents < totalAgents) {
      const inactive = totalAgents - inactiveAgents;
      alerts.push({ type: 'info', title: 'Inactive Agents', description: `${inactive} agent${inactive > 1 ? 's' : ''} ha${inactive > 1 ? 've' : 's'} no activity today.`, count: inactive });
    }

    await this.cache.set(cacheKey, alerts, 120);
    return alerts;
  }

  async getPipelineHealth(): Promise<PipelineHealth> {
    const cacheKey = 'dashboard:pipeline-health';
    const cached = await this.cache.get<PipelineHealth>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [stuckDeals, stageLogs, lostReasons, stages] = await Promise.all([
      this.prisma.lead.count({
        where: { stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST', 'DUPLICATE'] }, updatedAt: { lte: fourteenDaysAgo } },
      }),
      this.prisma.leadStageLog.findMany({
        select: { fromStage: true, toStage: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5000,
      }),
      this.prisma.lead.groupBy({
        by: ['lostReason'],
        where: { stage: 'CLOSED_LOST', lostReason: { not: null } },
        _count: { lostReason: true },
        orderBy: { _count: { lostReason: 'desc' } },
        take: 3,
      }),
      this.prisma.leadStageLog.groupBy({
        by: ['fromStage'],
        _count: { fromStage: true },
      }),
    ]);

    const stageAgingMap = new Map<string, { days: number; count: number }>();
    for (const log of stageLogs) {
      const days = Math.round((now.getTime() - log.createdAt.getTime()) / (24 * 60 * 60 * 1000));
      const existing = stageAgingMap.get(log.toStage);
      if (existing) {
        existing.days += days;
        existing.count += 1;
      } else {
        stageAgingMap.set(log.toStage, { days, count: 1 });
      }
    }

    const stageAging = Array.from(stageAgingMap.entries())
      .map(([stage, { days, count }]) => ({
        stage,
        label: stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        avgDays: Math.round(days / count),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const result: PipelineHealth = {
      stuckDeals,
      stageAging,
      topLostReasons: lostReasons.map((r) => ({
        reason: r.lostReason!,
        count: r._count.lostReason,
      })),
      avgDaysPerStage: stageAging.map((s) => ({ stage: s.stage, label: s.label, avgDays: s.avgDays })),
    };

    await this.cache.set(cacheKey, result, 120);
    return result;
  }

  private async computeKpis(where?: any) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, leadsToday, hotLeads, pendingFollowUps, siteVisitsToday, closedWon, revenueAgg, pipelineAgg] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.count({ where: { ...where, createdAt: { gte: today } } }),
      this.prisma.lead.count({ where: { ...where, isHot: true } }),
      this.prisma.task.count({ where: { isCompleted: false, dueDate: { lte: now }, ...where } }),
      this.prisma.siteVisit.count({ where: { visitDate: { gte: today } } }),
      this.prisma.lead.count({ where: { ...where, stage: 'CLOSED_WON', convertedAt: { gte: monthStart } } }),
      this.prisma.booking.aggregate({
        where: { status: 'CONFIRMED', bookingDate: { gte: monthStart } },
        _sum: { totalAmount: true },
      }),
      this.prisma.lead.aggregate({
        where: { ...where, stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST', 'DUPLICATE'] }, budget: { not: null } },
        _sum: { budget: true },
      }),
    ]);

    return {
      totalLeads: total,
      leadsToday,
      hotLeads,
      pendingFollowUps,
      siteVisitsToday,
      closedThisMonth: closedWon,
      revenueThisMonth: Number(revenueAgg._sum.totalAmount ?? 0),
      pipelineValue: Number(pipelineAgg._sum.budget ?? 0),
    };
  }
}
