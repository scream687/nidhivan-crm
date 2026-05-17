import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityType, Role, User } from '@prisma/client';

@Injectable()
export class SiteVisitsService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
    private notifications: NotificationsService,
  ) {}

  async schedule(leadId: string, data: { project: string; visitDate: string; assignedToId: string }, userId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const visit = await this.prisma.siteVisit.create({
      data: {
        leadId,
        project: data.project,
        visitDate: new Date(data.visitDate),
        assignedToId: data.assignedToId,
        status: 'SCHEDULED',
      },
      include: { assignedTo: { select: { id: true, name: true } }, lead: { select: { name: true, leadNumber: true } } },
    });

    // Log activity
    const activity = await this.prisma.activity.create({
      data: {
        type: ActivityType.SITE_VISIT,
        title: `Site Visit Scheduled: ${data.project}`,
        description: `Scheduled for ${new Date(data.visitDate).toLocaleString('en-IN')}`,
        userId,
        leadId,
      },
      include: { user: { select: { id: true, name: true } }, lead: { select: { name: true, assignedToId: true } } },
    });

    // Update lead stage
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { stage: 'SITE_VISIT_SCHEDULED' },
    });

    // Notifications
    await this.notifications.create(
      data.assignedToId,
      'Site Visit Scheduled',
      `You have a site visit scheduled for lead ${lead.name} at ${data.project} on ${new Date(data.visitDate).toLocaleString('en-IN')}`,
      'site_visit_scheduled',
      visit.id,
      'SiteVisit',
    );

    this.gateway.emitToAdmin('activity:new', activity);
    this.gateway.emitToUser(data.assignedToId, 'activity:new', activity);
    this.gateway.emitToUser(data.assignedToId, 'notification:new', { title: 'Site Visit Scheduled', body: `Visit for ${lead.name} at ${data.project}` });

    return visit;
  }

  async updateStatus(id: string, status: string, feedback?: string, rating?: number, userId?: string) {
    const visit = await this.prisma.siteVisit.findUnique({ where: { id }, include: { lead: true } });
    if (!visit) throw new NotFoundException('Site visit not found');

    const updated = await this.prisma.siteVisit.update({
      where: { id },
      data: { status, feedback, rating },
    });

    if (status === 'COMPLETED') {
      await this.prisma.lead.update({
        where: { id: visit.leadId },
        data: { stage: 'SITE_VISIT_COMPLETED' },
      });

      const activity = await this.prisma.activity.create({
        data: {
          type: ActivityType.SITE_VISIT,
          title: `Site Visit Completed: ${visit.project}`,
          description: feedback || 'Visit completed successfully',
          userId: userId || visit.assignedToId,
          leadId: visit.leadId,
        },
        include: { user: { select: { id: true, name: true } }, lead: { select: { name: true, assignedToId: true } } },
      });

      this.gateway.emitToAdmin('activity:new', activity);
      this.gateway.emitToUser(visit.assignedToId, 'activity:new', activity);
    }

    return updated;
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
      orderBy: { visitDate: 'desc' },
    });
  }
}
