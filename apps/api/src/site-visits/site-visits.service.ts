import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { BusinessMetricsService } from '../metrics/business-metrics.service';
import { ActivityType, InterestLevel, Priority, Role, User, VisitOutcome } from '@prisma/client';

const STAGE_ORDER = [
  'NEW', 'ATTEMPTED', 'CONNECTED', 'INTERESTED', 'HOT',
  'SITE_VISIT_SCHEDULED', 'SITE_VISIT_COMPLETED', 'NEGOTIATION',
  'BOOKING_PENDING', 'CLOSED_WON', 'CLOSED_LOST', 'FUTURE_PROSPECT',
];

@Injectable()
export class SiteVisitsService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
    private notifications: NotificationsService,
    private metrics: BusinessMetricsService,
  ) {}

  async schedule(
    leadId: string,
    data: { scheduledAt: string; address: string; propertyShown?: string; driverName?: string; driverPhone?: string; pickupLocation?: string; pickupTime?: string },
    userId: string,
  ) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const visit = await this.prisma.siteVisit.create({
      data: {
        leadId,
        assignedToId: userId,
        scheduledAt: new Date(data.scheduledAt),
        visitDate: new Date(data.scheduledAt),
        address: data.address,
        project: data.address,
        propertyShown: data.propertyShown,
        driverName: data.driverName,
        driverPhone: data.driverPhone,
        pickupLocation: data.pickupLocation,
        pickupTime: data.pickupTime,
        status: 'SCHEDULED',
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        lead: { select: { name: true, leadNumber: true } },
      },
    });

    const activity = await this.prisma.activity.create({
      data: {
        type: ActivityType.SITE_VISIT,
        title: `Site Visit Scheduled`,
        description: `Scheduled for ${new Date(data.scheduledAt).toLocaleString('en-IN')} at ${data.address}`,
        userId,
        leadId,
      },
      include: { user: { select: { id: true, name: true } }, lead: { select: { name: true, assignedToId: true } } },
    });

    // Only advance stage if not already past SITE_VISIT_SCHEDULED
    const currentIdx = STAGE_ORDER.indexOf(lead.stage);
    const targetIdx = STAGE_ORDER.indexOf('SITE_VISIT_SCHEDULED');
    if (currentIdx < targetIdx) {
      await this.prisma.lead.update({ where: { id: leadId }, data: { stage: 'SITE_VISIT_SCHEDULED' } });
    }

    await this.notifications.create(
      userId,
      'Site Visit Scheduled',
      `You have a site visit on ${new Date(data.scheduledAt).toLocaleDateString('en-IN')} at ${data.address}`,
      'site_visit_scheduled',
      visit.id,
      'SiteVisit',
    );

    this.metrics.onVisitChanged().catch((e) => console.error("async", e));
    this.gateway.emitToAdmin('activity:new', activity);
    this.gateway.emitToUser(userId, 'activity:new', activity);
    this.gateway.emitToUser(userId, 'notification:new', { title: 'Site Visit Scheduled', body: `Visit for ${lead.name}` });

    return visit;
  }

  async findByLead(leadId: string) {
    return this.prisma.siteVisit.findMany({
      where: { leadId },
      include: {
        assignedTo: { select: { id: true, name: true } },
        conductedBy: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async findOne(leadId: string, visitId: string) {
    const visit = await this.prisma.siteVisit.findFirst({
      where: { id: visitId, leadId },
      include: {
        assignedTo: { select: { id: true, name: true } },
        conductedBy: { select: { id: true, name: true } },
      },
    });
    if (!visit) throw new NotFoundException('Site visit not found');
    return visit;
  }

  async updateOutcome(
    leadId: string,
    visitId: string,
    data: {
      outcome: VisitOutcome;
      interestLevel?: InterestLevel;
      propertyShown?: string;
      objections?: string;
      followUpNotes?: string;
      followUpDate?: string;
      conductedById?: string;
    },
    userId: string,
  ) {
    const visit = await this.prisma.siteVisit.findFirst({
      where: { id: visitId, leadId },
      include: { lead: true },
    });
    if (!visit) throw new NotFoundException('Site visit not found');

    const conductedById = data.conductedById ?? visit.assignedToId;

    const updated = await this.prisma.siteVisit.update({
      where: { id: visitId },
      data: {
        outcome: data.outcome,
        interestLevel: data.interestLevel,
        propertyShown: data.propertyShown,
        objections: data.objections,
        followUpNotes: data.followUpNotes,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
        conductedById,
        status: data.outcome,
        feedback: data.followUpNotes,
      },
    });

    // Stage transitions
    const stageMap: Partial<Record<VisitOutcome, string>> = {
      [VisitOutcome.COMPLETED]: 'SITE_VISIT_COMPLETED',
      [VisitOutcome.NO_SHOW]: 'CONNECTED',
    };
    const targetStage = stageMap[data.outcome];
    if (targetStage) {
      const currentIdx = STAGE_ORDER.indexOf(visit.lead.stage);
      const targetIdx = STAGE_ORDER.indexOf(targetStage);
      if (data.outcome === VisitOutcome.NO_SHOW || currentIdx < targetIdx) {
        await this.prisma.lead.update({ where: { id: leadId }, data: { stage: targetStage } });
      }
    }

    const activity = await this.prisma.activity.create({
      data: {
        type: ActivityType.SITE_VISIT,
        title: `Site Visit ${data.outcome.replace('_', ' ')}`,
        description: data.followUpNotes || `Visit outcome recorded`,
        userId,
        leadId,
      },
      include: { user: { select: { id: true, name: true } }, lead: { select: { name: true, assignedToId: true } } },
    });

    // Auto follow-up task for COMPLETED visits with a follow-up date
    if (data.outcome === VisitOutcome.COMPLETED && data.followUpDate) {
      await this.prisma.task.create({
        data: {
          title: 'Follow up after site visit',
          description: data.followUpNotes,
          dueDate: new Date(data.followUpDate),
          leadId,
          assignedToId: conductedById,
          priority: Priority.HIGH,
        },
      });
    }

    this.metrics.onVisitChanged().catch((e) => console.error("async", e));
    this.gateway.emitToAdmin('activity:new', activity);
    this.gateway.emitToUser(visit.assignedToId, 'activity:new', activity);
    if (visit.lead.assignedToId) {
      this.gateway.emitToUser(visit.lead.assignedToId, 'lead:updated', { leadId });
    }

    return updated;
  }

  async checkin(visitId: string, data: { gpsLatitude: number; gpsLongitude: number }) {
    const visit = await this.prisma.siteVisit.findUnique({ where: { id: visitId } });
    if (!visit) throw new NotFoundException('Site visit not found');

    return this.prisma.siteVisit.update({
      where: { id: visitId },
      data: {
        gpsLatitude: data.gpsLatitude,
        gpsLongitude: data.gpsLongitude,
        gpsCheckedInAt: new Date(),
      },
    });
  }

  async addPhotos(visitId: string, data: { photoUrls: string[] }) {
    if (!data.photoUrls.length) throw new BadRequestException('At least one photo URL required');

    return this.prisma.siteVisit.update({
      where: { id: visitId },
      data: {
        photos: { push: data.photoUrls },
      },
    });
  }

  async addVoiceNote(visitId: string, fileUrl: string, duration?: number) {
    const visit = await this.prisma.siteVisit.findUnique({ where: { id: visitId } });
    if (!visit) throw new NotFoundException('Site visit not found');

    const entry = JSON.stringify({ type: 'voice', url: fileUrl, duration: duration ?? null, uploadedAt: new Date().toISOString() });

    return this.prisma.siteVisit.update({
      where: { id: visitId },
      data: { photos: { push: entry } },
    });
  }

  async getCalendar(startDate: string, endDate: string) {
    const visits = await this.prisma.siteVisit.findMany({
      where: {
        visitDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        lead: { select: { id: true, name: true, leadNumber: true } },
        assignedTo: { select: { id: true, name: true } },
        conductedBy: { select: { id: true, name: true } },
      },
      orderBy: { visitDate: 'asc' },
    });

    const grouped: Record<string, typeof visits> = {};
    for (const visit of visits) {
      const dateKey = visit.visitDate.toISOString().slice(0, 10);
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(visit);
    }

    return Object.entries(grouped).map(([date, visits]) => ({ date, visits }));
  }

  async remove(leadId: string, visitId: string) {
    const visit = await this.prisma.siteVisit.findFirst({ where: { id: visitId, leadId } });
    if (!visit) throw new NotFoundException('Site visit not found');
    return this.prisma.siteVisit.delete({ where: { id: visitId } });
  }

  async findAll(user: User) {
    const where: any = {};
    if (user.role === Role.SALES_AGENT || user.role === Role.TELECALLER) {
      where.assignedToId = user.id;
    }
    return this.prisma.siteVisit.findMany({
      where,
      include: {
        lead: { select: { id: true, name: true, leadNumber: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }
}
