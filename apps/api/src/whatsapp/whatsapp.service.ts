import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private prisma: PrismaService) {}

  async getConfig() {
    return this.prisma.whatsAppConfig.findFirst();
  }

  async saveConfig(data: {
    phoneNumberId: string;
    wabaId: string;
    accessToken: string;
    verifyToken?: string;
    displayName?: string;
    isActive?: boolean;
  }) {
    return this.prisma.whatsAppConfig.upsert({
      where: { id: 'singleton' },
      update: data,
      create: { id: 'singleton', ...data },
    });
  }

  async sendMessage(to: string, body: string, agentId?: string) {
    const config = await this.getConfig();
    if (!config || !config.isActive) {
      throw new BadRequestException('WhatsApp is not configured or inactive');
    }

    // Find or create contact
    const contact = await this.prisma.whatsAppContact.upsert({
      where: { phone: to },
      update: {},
      create: { phone: to },
    });

    // Call WhatsApp Cloud API
    const url = `https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      }),
    });

    const result: any = await response.json();

    if (!response.ok || result.error) {
      this.logger.error('WhatsApp API error', result);
      throw new BadRequestException(result?.error?.message || 'Failed to send message');
    }

    const waMessageId: string | undefined = result?.messages?.[0]?.id;

    // Save outgoing message to DB
    const message = await this.prisma.whatsAppMessage.create({
      data: {
        waMessageId,
        contactId: contact.id,
        direction: 'out',
        type: 'text',
        body,
        status: 'sent',
        agentId,
      },
    });

    return { message, contact };
  }

  async handleIncomingWebhook(payload: any) {
    try {
      const entry = payload?.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;

      if (!value?.messages?.length) {
        return { status: 'no_messages' };
      }

      const msg = value.messages[0];
      const contactInfo = value?.contacts?.[0];
      const phone: string = msg.from;
      const waMessageId: string = msg.id;
      const msgType: string = msg.type || 'text';
      const body: string | undefined = msg?.text?.body;
      const timestamp = new Date(parseInt(msg.timestamp, 10) * 1000);

      // Find or create contact
      const contact = await this.prisma.whatsAppContact.upsert({
        where: { phone },
        update: contactInfo?.profile?.name
          ? { name: contactInfo.profile.name }
          : {},
        create: {
          phone,
          name: contactInfo?.profile?.name,
        },
      });

      // Save incoming message
      const message = await this.prisma.whatsAppMessage.upsert({
        where: { waMessageId },
        update: {},
        create: {
          waMessageId,
          contactId: contact.id,
          direction: 'in',
          type: msgType,
          body,
          status: 'delivered',
          timestamp,
        },
      });

      return { status: 'ok', message, contact };
    } catch (err) {
      this.logger.error('Error handling incoming webhook', err);
      return { status: 'error', error: (err as Error).message };
    }
  }

  async getConversations() {
    const contacts = await this.prisma.whatsAppContact.findMany({
      include: {
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
        lead: {
          select: { id: true, name: true, stage: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // For each contact, count unread incoming messages
    const result = await Promise.all(
      contacts.map(async (contact) => {
        const unreadCount = await this.prisma.whatsAppMessage.count({
          where: {
            contactId: contact.id,
            direction: 'in',
            status: { not: 'read' },
          },
        });
        return {
          ...contact,
          latestMessage: contact.messages[0] ?? null,
          unreadCount,
        };
      }),
    );

    return result;
  }

  async getMessages(contactId: string) {
    const contact = await this.prisma.whatsAppContact.findUnique({
      where: { id: contactId },
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    const messages = await this.prisma.whatsAppMessage.findMany({
      where: { contactId },
      orderBy: { timestamp: 'asc' },
    });

    // Mark incoming messages as read
    await this.markRead(contactId);

    return messages;
  }

  async getAnalytics(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const messages = await this.prisma.whatsAppMessage.findMany({
      where: { timestamp: { gte: since } },
      orderBy: { timestamp: 'asc' },
    });

    const dayMap = new Map<string, { day: string; date: string; sent: number; delivered: number; read: number; replied: number }>();
    const days_arr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dayMap.set(key, { day: days_arr[d.getDay()], date: key, sent: 0, delivered: 0, read: 0, replied: 0 });
    }

    for (const m of messages) {
      const key = m.timestamp.toISOString().slice(0, 10);
      const entry = dayMap.get(key);
      if (!entry) continue;
      if (m.direction === 'out') {
        entry.sent++;
        if (['delivered', 'read'].includes(m.status)) entry.delivered++;
        if (m.status === 'read') entry.read++;
      } else {
        entry.replied++;
      }
    }

    const totalSent = messages.filter(m => m.direction === 'out').length;
    const totalRead = messages.filter(m => m.direction === 'out' && m.status === 'read').length;
    const totalReplied = messages.filter(m => m.direction === 'in').length;

    return {
      daily: Array.from(dayMap.values()),
      totalSent,
      totalRead,
      totalReplied,
      readRate: totalSent > 0 ? +((totalRead / totalSent) * 100).toFixed(1) : 0,
      replyRate: totalSent > 0 ? +((totalReplied / totalSent) * 100).toFixed(1) : 0,
    };
  }

  async markRead(contactId: string) {
    await this.prisma.whatsAppMessage.updateMany({
      where: {
        contactId,
        direction: 'in',
        status: { not: 'read' },
      },
      data: { status: 'read' },
    });
  }
}
