import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeadSource, CallStatus, ActivityType } from '@prisma/client';
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

  async getPipelineValue() {
    const stageConfigs = await this.prisma.stageConfig.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } });
    const stages = await Promise.all(
      stageConfigs.map(async (sc) => {
        const count = await this.prisma.lead.count({ where: { stage: sc.name } });
        const leads = await this.prisma.lead.findMany({
          where: { stage: sc.name, budget: { not: null }, closingProbability: { not: null } },
          select: { budget: true, closingProbability: true },
        });
        const expectedRevenue = leads.reduce((sum, l) => sum + Number(l.budget!) * l.closingProbability!, 0);
        return { stage: sc.name, label: sc.label, count, expectedRevenue: Math.round(expectedRevenue * 100) / 100 };
      }),
    );
    const totalExpectedRevenue = stages.reduce((sum, s) => sum + s.expectedRevenue, 0);
    return { stages, totalExpectedRevenue: Math.round(totalExpectedRevenue * 100) / 100 };
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

  async getSiteVisitReport(from?: Date, to?: Date) {
    const cacheKey = `report:site-visits:${from?.toISOString() ?? ''}:${to?.toISOString() ?? ''}`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const where: any = {};
    if (from || to) where.visitDate = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

    const visits = await this.prisma.siteVisit.findMany({
      where,
      select: { id: true, project: true, assignedToId: true, leadId: true, outcome: true, visitDate: true },
    });

    const total = visits.length;
    const allLeadIds = [...new Set(visits.map(v => v.leadId))];

    const bookingLeads = await this.prisma.booking.findMany({
      where: { leadId: { in: allLeadIds } },
      select: { leadId: true },
    });
    const bookedLeadIds = new Set(bookingLeads.map(b => b.leadId));

    const projectMap = new Map<string, { visits: number; leads: Set<string> }>();
    for (const v of visits) {
      if (!projectMap.has(v.project)) projectMap.set(v.project, { visits: 0, leads: new Set() });
      const p = projectMap.get(v.project)!;
      p.visits++;
      p.leads.add(v.leadId);
    }
    const byProject = [...projectMap.entries()].map(([project, d]) => {
      const booked = [...d.leads].filter(id => bookedLeadIds.has(id)).length;
      return {
        project,
        visits: d.visits,
        uniqueLeads: d.leads.size,
        bookings: booked,
        conversion: d.leads.size ? +((booked / d.leads.size) * 100).toFixed(1) : 0,
      };
    });

    const agentMap = new Map<string, { visits: number; leads: Set<string> }>();
    for (const v of visits) {
      if (!agentMap.has(v.assignedToId)) agentMap.set(v.assignedToId, { visits: 0, leads: new Set() });
      const a = agentMap.get(v.assignedToId)!;
      a.visits++;
      a.leads.add(v.leadId);
    }
    const agentIds = [...agentMap.keys()];
    const agents = agentIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: agentIds } }, select: { id: true, name: true } })
      : [];
    const agentNameMap = new Map(agents.map(a => [a.id, a.name]));
    const byAgent = [...agentMap.entries()].map(([id, d]) => ({
      agent: agentNameMap.get(id) || 'Unknown',
      visits: d.visits,
      uniqueLeads: d.leads.size,
    }));

    const outcomeBreakdown: Record<string, number> = {};
    for (const v of visits) {
      if (v.outcome) outcomeBreakdown[v.outcome] = (outcomeBreakdown[v.outcome] || 0) + 1;
    }

    const monthMap = new Map<string, number>();
    for (const v of visits) {
      const m = `${v.visitDate.getFullYear()}-${String(v.visitDate.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(m, (monthMap.get(m) || 0) + 1);
    }
    const monthlyTrend = [...monthMap.entries()]
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const result = { total, byProject, byAgent, outcomeBreakdown, monthlyTrend };
    await this.cache.set(cacheKey, result, 300);
    return result;
  }

  async getBookingReport(from?: Date, to?: Date) {
    const cacheKey = `report:bookings:${from?.toISOString() ?? ''}:${to?.toISOString() ?? ''}`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const where: any = {};
    if (from || to) where.bookingDate = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

    const bookings = await this.prisma.booking.findMany({
      where,
      select: {
        id: true,
        totalAmount: true,
        bookingDate: true,
        agentId: true,
        agentCommission: true,
        registryStatus: true,
        project: { select: { name: true } },
        agent: { select: { name: true } },
      },
    });

    const total = bookings.length;
    const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
    const avgValue = total ? totalRevenue / total : 0;

    const monthMap = new Map<string, { count: number; revenue: number }>();
    for (const b of bookings) {
      const m = `${b.bookingDate.getFullYear()}-${String(b.bookingDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap.has(m)) monthMap.set(m, { count: 0, revenue: 0 });
      const entry = monthMap.get(m)!;
      entry.count++;
      entry.revenue += Number(b.totalAmount);
    }
    const monthlyTrend = [...monthMap.entries()]
      .map(([month, d]) => ({ month, count: d.count, revenue: +d.revenue.toFixed(2) }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const projectMap = new Map<string, { bookings: number; revenue: number }>();
    for (const b of bookings) {
      const pn = b.project.name;
      if (!projectMap.has(pn)) projectMap.set(pn, { bookings: 0, revenue: 0 });
      const p = projectMap.get(pn)!;
      p.bookings++;
      p.revenue += Number(b.totalAmount);
    }
    const byProject = [...projectMap.entries()].map(([project, d]) => ({
      project,
      bookings: d.bookings,
      totalRevenue: +d.revenue.toFixed(2),
    }));

    const agentMap = new Map<string, { bookings: number; commission: number }>();
    for (const b of bookings) {
      const an = b.agent.name;
      if (!agentMap.has(an)) agentMap.set(an, { bookings: 0, commission: 0 });
      const a = agentMap.get(an)!;
      a.bookings++;
      if (b.agentCommission) a.commission += Number(b.agentCommission);
    }
    const byAgent = [...agentMap.entries()].map(([agent, d]) => ({
      agent,
      bookings: d.bookings,
      commissionEarned: +d.commission.toFixed(2),
    }));

    const registryBreakdown: Record<string, number> = {};
    for (const b of bookings) {
      const rs = b.registryStatus || 'UNKNOWN';
      registryBreakdown[rs] = (registryBreakdown[rs] || 0) + 1;
    }

    const result = {
      total,
      totalRevenue: +totalRevenue.toFixed(2),
      averageBookingValue: +avgValue.toFixed(2),
      monthlyTrend,
      byProject,
      byAgent,
      registryBreakdown,
    };
    await this.cache.set(cacheKey, result, 300);
    return result;
  }

  async getFollowUpReport(from?: Date, to?: Date) {
    const cacheKey = `report:followups:${from?.toISOString() ?? ''}:${to?.toISOString() ?? ''}`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const where: any = {};
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

    const tasks = await this.prisma.task.findMany({
      where,
      select: {
        id: true,
        isCompleted: true,
        completedAt: true,
        dueDate: true,
        createdAt: true,
        assignedTo: { select: { name: true } },
      },
    });

    const total = tasks.length;
    const completed = tasks.filter(t => t.isCompleted).length;
    const completionRate = total ? +((completed / total) * 100).toFixed(1) : 0;

    let timely = 0;
    let overdue = 0;
    for (const t of tasks) {
      if (t.isCompleted && t.dueDate && t.completedAt) {
        if (t.completedAt <= t.dueDate) timely++;
        else overdue++;
      } else if (!t.isCompleted && t.dueDate && t.dueDate < new Date()) {
        overdue++;
      }
    }

    const agentMap = new Map<string, { assigned: number; completed: number; overdue: number }>();
    for (const t of tasks) {
      const an = t.assignedTo.name;
      if (!agentMap.has(an)) agentMap.set(an, { assigned: 0, completed: 0, overdue: 0 });
      const a = agentMap.get(an)!;
      a.assigned++;
      if (t.isCompleted) a.completed++;
      let isOverdue = false;
      if (t.isCompleted && t.dueDate && t.completedAt && t.completedAt > t.dueDate) isOverdue = true;
      else if (!t.isCompleted && t.dueDate && t.dueDate < new Date()) isOverdue = true;
      if (isOverdue) a.overdue++;
    }
    const byAgent = [...agentMap.entries()].map(([agent, d]) => ({ agent, ...d }));

    const dayMap = new Map<string, number>();
    for (const t of tasks) {
      const d = t.createdAt.toISOString().split('T')[0];
      dayMap.set(d, (dayMap.get(d) || 0) + 1);
    }
    const dailyTrend = [...dayMap.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const result = { total, completed, completionRate, timely, overdue, byAgent, dailyTrend };
    await this.cache.set(cacheKey, result, 300);
    return result;
  }

  async getActivityReport(from?: Date, to?: Date) {
    const cacheKey = `report:activities:${from?.toISOString() ?? ''}:${to?.toISOString() ?? ''}`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const dateFilter: any = {};
    if (from || to) dateFilter.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
    const msgFilter: any = {};
    if (from || to) msgFilter.timestamp = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

    const [calls, messages, activities] = await Promise.all([
      this.prisma.callLog.findMany({
        where: dateFilter,
        select: { id: true, status: true, duration: true, createdAt: true },
      }),
      this.prisma.whatsAppMessage.findMany({
        where: msgFilter,
        select: { id: true, timestamp: true },
      }),
      this.prisma.activity.findMany({
        where: dateFilter,
        select: { id: true, type: true, createdAt: true },
      }),
    ]);

    const totalCalls = calls.length;
    const totalMessages = messages.length;
    const totalActivities = activities.length;

    const answered = calls.filter(c => c.status === 'COMPLETED').length;
    const callAnswerRate = totalCalls ? +((answered / totalCalls) * 100).toFixed(1) : 0;

    const callsWithDuration = calls.filter(c => c.duration != null);
    const avgCallDuration = callsWithDuration.length
      ? +(callsWithDuration.reduce((s, c) => s + c.duration!, 0) / callsWithDuration.length).toFixed(0)
      : 0;

    const typeBreakdown: Record<string, number> = {};
    for (const a of activities) {
      typeBreakdown[a.type] = (typeBreakdown[a.type] || 0) + 1;
    }

    const dayMap = new Map<string, { calls: number; messages: number; activities: number }>();
    for (const c of calls) {
      const d = c.createdAt.toISOString().split('T')[0];
      if (!dayMap.has(d)) dayMap.set(d, { calls: 0, messages: 0, activities: 0 });
      dayMap.get(d)!.calls++;
    }
    for (const m of messages) {
      const d = m.timestamp.toISOString().split('T')[0];
      if (!dayMap.has(d)) dayMap.set(d, { calls: 0, messages: 0, activities: 0 });
      dayMap.get(d)!.messages++;
    }
    for (const a of activities) {
      const d = a.createdAt.toISOString().split('T')[0];
      if (!dayMap.has(d)) dayMap.set(d, { calls: 0, messages: 0, activities: 0 });
      dayMap.get(d)!.activities++;
    }

    const dailyTrend = [...dayMap.entries()]
      .map(([date, d]) => ({ date, ...d }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const result = { totalCalls, totalMessages, totalActivities, callAnswerRate, avgCallDuration, typeBreakdown, dailyTrend };
    await this.cache.set(cacheKey, result, 300);
    return result;
  }

  async getConversionReport() {
    const cached = await this.cache.get<any>('report:conversion');
    if (cached) return cached;

    const stageConfigs = await this.prisma.stageConfig.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
    const pipeline = ['NEW', ...stageConfigs.map(s => s.name)];
    const stageRank = new Map(pipeline.map((s, i) => [s, i]));

    const leads = await this.prisma.lead.findMany({ select: { id: true, stage: true } });
    const logs = await this.prisma.leadStageLog.findMany({
      orderBy: { createdAt: 'asc' },
      select: { leadId: true, toStage: true, createdAt: true },
    });

    const leadPerLeadTimeline = new Map<string, { stage: string; enteredAt: Date }[]>();
    for (const log of logs) {
      if (!leadPerLeadTimeline.has(log.leadId)) leadPerLeadTimeline.set(log.leadId, []);
      leadPerLeadTimeline.get(log.leadId)!.push({ stage: log.toStage, enteredAt: log.createdAt });
    }

    const leadMaxRank = new Map<string, number>();
    for (const l of leads) {
      leadMaxRank.set(l.id, stageRank.get(l.stage) ?? -1);
    }
    for (const log of logs) {
      const rank = stageRank.get(log.toStage) ?? -1;
      const current = leadMaxRank.get(log.leadId) ?? -1;
      if (rank > current) leadMaxRank.set(log.leadId, rank);
    }

    const stagePairs = [];
    for (let i = 0; i < pipeline.length - 1; i++) {
      const source = pipeline[i];
      const target = pipeline[i + 1];
      const entered = [...leadMaxRank.values()].filter(r => r >= i).length;
      const progressed = [...leadMaxRank.values()].filter(r => r >= i + 1).length;

      const dayDiffs: number[] = [];
      for (const [leadId, timeline] of leadPerLeadTimeline) {
        const srcIdx = timeline.findIndex(t => t.stage === source);
        const tgtIdx = timeline.findIndex(t => t.stage === target);
        if (srcIdx !== -1 && tgtIdx !== -1 && tgtIdx > srcIdx) {
          dayDiffs.push((timeline[tgtIdx].enteredAt.getTime() - timeline[srcIdx].enteredAt.getTime()) / 86400000);
        }
      }

      stagePairs.push({
        from: source,
        to: target,
        entered,
        progressed,
        conversionRate: entered ? +((progressed / entered) * 100).toFixed(1) : 0,
        avgDaysToConvert: dayDiffs.length ? +(dayDiffs.reduce((a, b) => a + b, 0) / dayDiffs.length).toFixed(1) : null,
      });
    }

    const totalLeads = leads.length;
    const totalBookings = await this.prisma.booking.count();

    const result = {
      stages: stagePairs,
      overall: {
        totalLeads,
        totalBookings,
        conversionRate: totalLeads ? +((totalBookings / totalLeads) * 100).toFixed(1) : 0,
      },
    };
    await this.cache.set('report:conversion', result, 300);
    return result;
  }

  async getDashboardOverview() {
    const cached = await this.cache.get<any>('report:dashboard-overview');
    if (cached) return cached;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - (weekStart.getDay() || 7) + 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = monthStart;

    const [
      newLeadsToday,
      newLeadsWeek,
      newLeadsMonth,
      visitsToday,
      visitsWeek,
      visitsMonth,
      bookingsThisMonth,
      bookingsLastMonth,
      revenueThisMonth,
      callsToday,
      followUpsDueToday,
      hotLeads,
      pipelineStages,
    ] = await Promise.all([
      this.prisma.lead.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.lead.count({ where: { createdAt: { gte: weekStart } } }),
      this.prisma.lead.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.siteVisit.count({ where: { visitDate: { gte: todayStart } } }),
      this.prisma.siteVisit.count({ where: { visitDate: { gte: weekStart } } }),
      this.prisma.siteVisit.count({ where: { visitDate: { gte: monthStart } } }),
      this.prisma.booking.count({ where: { bookingDate: { gte: monthStart } } }),
      this.prisma.booking.count({
        where: { bookingDate: { gte: lastMonthStart, lt: lastMonthEnd } },
      }),
      this.prisma.booking
        .aggregate({ _sum: { totalAmount: true }, where: { bookingDate: { gte: monthStart } } })
        .then(r => Number(r._sum.totalAmount || 0)),
      this.prisma.callLog.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.task.count({ where: { dueDate: { gte: todayStart, lt: todayEnd }, isCompleted: false } }),
      this.prisma.lead.count({ where: { isHot: true } }),
      this.getPipelineValue().then(pv => pv.totalExpectedRevenue),
    ]);

    const result = {
      newLeadsToday,
      newLeadsThisWeek: newLeadsWeek,
      newLeadsThisMonth: newLeadsMonth,
      siteVisitsToday: visitsToday,
      siteVisitsThisWeek: visitsWeek,
      siteVisitsThisMonth: visitsMonth,
      bookingsThisMonth,
      bookingsLastMonth,
      revenueThisMonth,
      callsToday,
      followUpsDueToday,
      hotLeads,
      pipelineValue: pipelineStages,
    };
    await this.cache.set('report:dashboard-overview', result, 120);
    return result;
  }
}
