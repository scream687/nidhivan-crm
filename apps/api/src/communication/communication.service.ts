import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TimelineFilters {
  cursor?: string;
  limit?: number;
  types?: string[];
  search?: string;
  from?: string;
  to?: string;
}

export interface TimelineItem {
  id: string;
  type: string;
  subtype?: string;
  content: string;
  timestamp: Date;
  direction?: string;
  metadata?: Record<string, any>;
}

export interface InboxEntry {
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadStage: string;
  lastCommunication: string | null;
  lastCommunicationType: string | null;
  lastCommunicationAt: Date | null;
  unreadCount: number;
}

@Injectable()
export class CommunicationService {
  constructor(private prisma: PrismaService) {}

  async getLeadTimeline(leadId: string, filters?: TimelineFilters) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        activities: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
        },
        callLogs: {
          orderBy: { createdAt: 'desc' },
        },
        whatsappContacts: {
          include: {
            messages: {
              orderBy: { timestamp: 'desc' },
            },
          },
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
        siteVisits: {
          orderBy: { createdAt: 'desc' },
        },
        bookings: {
          orderBy: { bookingDate: 'desc' },
        },
      },
    });

    if (!lead) throw new NotFoundException('Lead not found');

    const typeMap: Record<string, string> = {
      NOTE: 'NOTE', CALL: 'CALL', WHATSAPP: 'WHATSAPP', EMAIL: 'EMAIL',
      SITE_VISIT: 'SITE_VISIT', TASK: 'TASK', STAGE_CHANGE: 'STAGE_CHANGE',
      ASSIGNMENT: 'SYSTEM', SYSTEM: 'SYSTEM',
    };

    const activityItems: TimelineItem[] = lead.activities.map(a => ({
      id: a.id,
      type: typeMap[a.type] || 'SYSTEM',
      subtype: a.type,
      content: a.title + (a.description ? ` — ${a.description}` : ''),
      timestamp: a.createdAt,
      metadata: { ...(a.metadata as Record<string, any>), user: a.user },
    }));

    const callItems: TimelineItem[] = lead.callLogs.map(c => ({
      id: c.id,
      type: 'CALL',
      subtype: c.callType,
      content: c.notes || `${c.callType === 'INCOMING' ? 'Incoming' : 'Outgoing'} call${c.duration ? ` (${Math.floor(c.duration / 60)}m ${c.duration % 60}s)` : ''}`,
      timestamp: c.createdAt,
      direction: c.callType === 'INCOMING' ? 'in' : 'out',
      metadata: { duration: c.duration, recordingUrl: c.recordingUrl, status: c.status, fromNumber: c.fromNumber, toNumber: c.toNumber },
    }));

    const whatsappItems: TimelineItem[] = [];
    for (const contact of lead.whatsappContacts) {
      for (const msg of contact.messages) {
        whatsappItems.push({
          id: msg.id,
          type: 'WHATSAPP',
          subtype: msg.type,
          content: msg.body || `[${msg.type} media]`,
          timestamp: msg.timestamp,
          direction: msg.direction,
          metadata: { contactId: contact.id, contactName: contact.name, mediaUrl: msg.mediaUrl, status: msg.status },
        });
      }
    }

    const taskItems: TimelineItem[] = lead.tasks.map(t => ({
      id: t.id,
      type: 'TASK',
      subtype: t.isCompleted ? 'COMPLETED' : 'PENDING',
      content: t.title + (t.description ? ` — ${t.description}` : ''),
      timestamp: t.createdAt,
      metadata: { isCompleted: t.isCompleted, dueDate: t.dueDate, taskId: t.id },
    }));

    const visitItems: TimelineItem[] = lead.siteVisits.map(v => ({
      id: v.id,
      type: 'SITE_VISIT',
      subtype: v.outcome || v.status,
      content: `Site visit ${v.status.toLowerCase()} at ${v.address || v.project} on ${v.visitDate.toLocaleDateString('en-IN')}`,
      timestamp: v.createdAt,
      metadata: { visitDate: v.visitDate, status: v.status, outcome: v.outcome, address: v.address },
    }));

    const bookingItems: TimelineItem[] = lead.bookings.map(b => ({
      id: b.id,
      type: 'BOOKING',
      content: `Booking ${b.bookingNumber} — ${b.status}`,
      timestamp: b.bookingDate,
      metadata: { bookingNumber: b.bookingNumber, status: b.status, totalAmount: b.totalAmount },
    }));

    let items = [...activityItems, ...callItems, ...whatsappItems, ...taskItems, ...visitItems, ...bookingItems];

    if (filters?.types?.length) {
      items = items.filter(i => filters.types!.includes(i.type));
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(i => i.content.toLowerCase().includes(q));
    }
    if (filters?.from) {
      const from = new Date(filters.from);
      items = items.filter(i => i.timestamp >= from);
    }
    if (filters?.to) {
      const to = new Date(filters.to);
      items = items.filter(i => i.timestamp <= to);
    }

    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const limit = filters?.limit || 20;
    let cursorIdx = 0;
    if (filters?.cursor) {
      const [ts, id] = filters.cursor.split('_');
      const cursorTime = parseInt(ts, 10);
      cursorIdx = items.findIndex(i => i.timestamp.getTime() === cursorTime && i.id === id);
      if (cursorIdx === -1) cursorIdx = 0;
    }

    const total = items.length;
    const sliced = items.slice(cursorIdx, cursorIdx + limit);
    const nextCursor = sliced.length === limit && cursorIdx + limit < total
      ? `${sliced[sliced.length - 1].timestamp.getTime()}_${sliced[sliced.length - 1].id}`
      : null;

    return { items: sliced, nextCursor, total };
  }

  async getUnreadCount(userId: string) {
    const leadIds = await this.prisma.lead.findMany({
      where: { assignedToId: userId },
      select: { id: true },
    }).then(leads => leads.map(l => l.id));

    if (!leadIds.length) return { unreadWhatsApp: 0, missedCalls: 0, total: 0 };

    const [unreadWhatsApp, missedCalls] = await Promise.all([
      this.prisma.whatsAppMessage.count({
        where: {
          contact: { leadId: { in: leadIds } },
          direction: 'in',
          status: { not: 'read' },
        },
      }),
      this.prisma.callLog.count({
        where: {
          leadId: { in: leadIds },
          status: { in: ['NO_ANSWER', 'FAILED', 'BUSY'] },
          callType: 'INCOMING',
        },
      }),
    ]);

    return { unreadWhatsApp, missedCalls, total: unreadWhatsApp + missedCalls };
  }

  async getUnifiedInbox(userId: string, filters?: { page?: number; limit?: number; search?: string }) {
    const page = filters?.page || 1;
    const perPage = filters?.limit || 50;

    const leads = await this.prisma.lead.findMany({
      where: { assignedToId: userId },
      include: {
        activities: { orderBy: { createdAt: 'desc' }, take: 1 },
        callLogs: { orderBy: { createdAt: 'desc' }, take: 1 },
        whatsappContacts: {
          include: { messages: { orderBy: { timestamp: 'desc' }, take: 1 } },
        },
      },
    });

    const entries: InboxEntry[] = await Promise.all(
      leads.map(async (lead) => {
        const latestActivity = lead.activities[0] || null;
        const latestCall = lead.callLogs[0] || null;
        const latestWhatsApp = lead.whatsappContacts
          .map(c => c.messages[0])
          .filter(Boolean)
          .sort((a, b) => b!.timestamp.getTime() - a!.timestamp.getTime())[0] || null;

        const communications: { timestamp: Date; content: string; type: string }[] = [];
        if (latestActivity) communications.push({ timestamp: latestActivity.createdAt, content: latestActivity.title, type: latestActivity.type });
        if (latestCall) communications.push({ timestamp: latestCall.createdAt, content: latestCall.notes || `Call (${latestCall.callType})`, type: 'CALL' });
        if (latestWhatsApp) communications.push({ timestamp: latestWhatsApp.timestamp, content: latestWhatsApp.body || '[media]', type: 'WHATSAPP' });

        communications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        const latest = communications[0] || null;

        const unreadCount = await this.prisma.whatsAppMessage.count({
          where: {
            contact: { leadId: lead.id },
            direction: 'in',
            status: { not: 'read' },
          },
        });

        return {
          leadId: lead.id,
          leadName: lead.name,
          leadPhone: lead.phone,
          leadStage: lead.stage,
          lastCommunication: latest ? latest.content.substring(0, 100) : null,
          lastCommunicationType: latest?.type || null,
          lastCommunicationAt: latest?.timestamp || null,
          unreadCount,
        };
      }),
    );

    let filtered = entries;
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(e =>
        e.leadName.toLowerCase().includes(q) ||
        (e.leadPhone && e.leadPhone.includes(q)) ||
        (e.lastCommunication && e.lastCommunication.toLowerCase().includes(q)),
      );
    }

    filtered.sort((a, b) => {
      if (!a.lastCommunicationAt && !b.lastCommunicationAt) return 0;
      if (!a.lastCommunicationAt) return 1;
      if (!b.lastCommunicationAt) return -1;
      return b.lastCommunicationAt.getTime() - a.lastCommunicationAt.getTime();
    });

    const total = filtered.length;
    const start = (page - 1) * perPage;
    const sliced = filtered.slice(start, start + perPage);

    return { items: sliced, total, page, perPage };
  }
}
