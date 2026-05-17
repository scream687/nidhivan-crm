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

    const contact = await this.prisma.whatsAppContact.upsert({
      where: { phone: to },
      update: {},
      create: { phone: to },
    });

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

      if (body) {
        this.processIncomingMessage(contact.id, phone, body).catch(() => {});
      }

      return { status: 'ok', message, contact };
    } catch (err) {
      this.logger.error('Error handling incoming webhook', err);
      return { status: 'error', error: (err as Error).message };
    }
  }

  // ── Flow + Rule Routing ────────────────────────────────────────────────────

  private async processIncomingMessage(contactId: string, phone: string, body: string) {
    // 1. Active flow session?
    const session = await this.prisma.flowSession.findFirst({
      where: { contactId, status: 'ACTIVE' },
      include: { flow: true },
    });

    if (session) {
      await this.advanceFlow(session, phone, body);
      return;
    }

    // 2. Does any flow trigger match?
    const flows = await this.prisma.chatbotFlow.findMany({ where: { isActive: true } });
    const text = body.toLowerCase().trim();
    for (const flow of flows) {
      const kw = flow.triggerKeyword.toLowerCase();
      const matched =
        flow.matchType === 'EXACT' ? text === kw :
        flow.matchType === 'STARTS_WITH' ? text.startsWith(kw) :
        text.includes(kw);
      if (matched) {
        await this.startFlow(flow, contactId, phone);
        return;
      }
    }

    // 3. Fall back to keyword rules
    await this.matchChatbotRule(phone, body);
  }

  private async startFlow(flow: any, contactId: string, phone: string) {
    const nodes: any[] = flow.nodes as any[];
    const edges: any[] = flow.edges as any[];

    // Find node after trigger
    const triggerNode = nodes.find((n: any) => n.type === 'trigger');
    if (!triggerNode) return;

    const firstEdge = edges.find((e: any) => e.source === triggerNode.id);
    const firstNode = firstEdge ? nodes.find((n: any) => n.id === firstEdge.target) : null;
    if (!firstNode) return;

    const session = await this.prisma.flowSession.create({
      data: {
        flowId: flow.id,
        contactId,
        currentNodeId: firstNode.id,
        status: 'ACTIVE',
      },
    });

    await this.executeNode(firstNode, session, flow, phone);
  }

  private async advanceFlow(session: any, phone: string, userReply: string) {
    const flow = session.flow;
    const nodes: any[] = flow.nodes as any[];
    const edges: any[] = flow.edges as any[];
    const currentNode = nodes.find((n: any) => n.id === session.currentNodeId);
    if (!currentNode) {
      await this.prisma.flowSession.update({ where: { id: session.id }, data: { status: 'COMPLETED' } });
      return;
    }

    const text = userReply.toLowerCase().trim();
    let nextNodeId: string | null = null;

    if (currentNode.type === 'question') {
      // Match button text or any outgoing edge
      const outEdges: any[] = edges.filter((e: any) => e.source === currentNode.id);
      const matchedEdge = outEdges.find((e: any) =>
        e.label && text.includes(e.label.toLowerCase())
      ) ?? outEdges[0];
      nextNodeId = matchedEdge?.target ?? null;

      // Store reply in collectedData
      const key = (currentNode.data?.variableName as string) || `q_${currentNode.id.slice(-4)}`;
      const existing = (session.collectedData as Record<string, string>) ?? {};
      await this.prisma.flowSession.update({
        where: { id: session.id },
        data: { collectedData: { ...existing, [key]: userReply } },
      });
    } else if (currentNode.type === 'condition') {
      const branches: any[] = currentNode.data?.branches ?? [];
      let matched = false;
      for (const branch of branches) {
        const kw = (branch.keyword ?? '').toLowerCase();
        const branchMatch =
          branch.matchType === 'EXACT' ? text === kw :
          branch.matchType === 'STARTS_WITH' ? text.startsWith(kw) :
          text.includes(kw);
        if (branchMatch) {
          const edge = edges.find((e: any) => e.source === currentNode.id && e.label === branch.label);
          nextNodeId = edge?.target ?? null;
          matched = true;
          break;
        }
      }
      if (!matched) {
        const defaultEdge = edges.find((e: any) => e.source === currentNode.id && e.label === 'default');
        nextNodeId = defaultEdge?.target ?? null;
      }
    }

    if (!nextNodeId) {
      await this.prisma.flowSession.update({ where: { id: session.id }, data: { status: 'COMPLETED' } });
      return;
    }

    const nextNode = nodes.find((n: any) => n.id === nextNodeId);
    if (!nextNode) {
      await this.prisma.flowSession.update({ where: { id: session.id }, data: { status: 'COMPLETED' } });
      return;
    }

    await this.prisma.flowSession.update({ where: { id: session.id }, data: { currentNodeId: nextNodeId } });
    await this.executeNode(nextNode, session, flow, phone);
  }

  private async executeNode(node: any, session: any, flow: any, phone: string) {
    const nodes: any[] = flow.nodes as any[];
    const edges: any[] = flow.edges as any[];

    switch (node.type) {
      case 'message': {
        const text = this.interpolate(node.data?.text ?? '', session.collectedData ?? {});
        await this.sendMessage(phone, text);
        // Auto-advance to next node
        const edge = edges.find((e: any) => e.source === node.id);
        if (edge) {
          const next = nodes.find((n: any) => n.id === edge.target);
          if (next) {
            await this.prisma.flowSession.update({ where: { id: session.id }, data: { currentNodeId: next.id } });
            await this.executeNode(next, session, flow, phone);
          }
        } else {
          await this.prisma.flowSession.update({ where: { id: session.id }, data: { status: 'COMPLETED' } });
        }
        break;
      }
      case 'question': {
        const text = this.interpolate(node.data?.text ?? '', session.collectedData ?? {});
        const buttons: string[] = node.data?.buttons ?? [];
        let msg = text;
        if (buttons.length) {
          msg += '\n\n' + buttons.map((b, i) => `${i + 1}. ${b}`).join('\n');
        }
        await this.sendMessage(phone, msg);
        // Stay on this node — wait for reply
        break;
      }
      case 'action': {
        await this.executeAction(node.data, session);
        const edge = edges.find((e: any) => e.source === node.id);
        if (edge) {
          const next = nodes.find((n: any) => n.id === edge.target);
          if (next) {
            await this.prisma.flowSession.update({ where: { id: session.id }, data: { currentNodeId: next.id } });
            await this.executeNode(next, session, flow, phone);
          }
        } else {
          await this.prisma.flowSession.update({ where: { id: session.id }, data: { status: 'COMPLETED' } });
        }
        break;
      }
      case 'end': {
        const text = node.data?.text;
        if (text) await this.sendMessage(phone, this.interpolate(text, session.collectedData ?? {}));
        await this.prisma.flowSession.update({ where: { id: session.id }, data: { status: 'COMPLETED' } });
        break;
      }
      case 'condition': {
        // condition waits for user reply — stay
        break;
      }
    }
  }

  private interpolate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`);
  }

  private async executeAction(actionData: any, session: any) {
    try {
      switch (actionData?.actionType) {
        case 'CHANGE_STAGE':
          if (actionData.config?.stage) {
            const contact = await this.prisma.whatsAppContact.findUnique({ where: { id: session.contactId } });
            if (contact?.leadId) {
              await this.prisma.lead.update({ where: { id: contact.leadId }, data: { stage: actionData.config.stage } });
            }
          }
          break;
        case 'NOTIFY_AGENT':
          // Notification would be sent via NotificationsService — keep simple for now
          break;
      }
    } catch (err) {
      this.logger.warn('Flow action failed', err);
    }
  }

  // ── Old keyword rules (fallback) ──────────────────────────────────────────

  private async matchChatbotRule(phone: string, incomingText: string) {
    const rules = await this.prisma.chatbotRule.findMany({
      where: { isActive: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
    const text = incomingText.toLowerCase().trim();
    for (const rule of rules) {
      const kw = rule.keyword.toLowerCase();
      const matched =
        rule.matchType === 'EXACT' ? text === kw :
        rule.matchType === 'STARTS_WITH' ? text.startsWith(kw) :
        text.includes(kw);
      if (matched) {
        await this.sendMessage(phone, rule.response);
        await this.prisma.chatbotRule.update({ where: { id: rule.id }, data: { hitCount: { increment: 1 } } });
        break;
      }
    }
  }

  // ── Conversations ──────────────────────────────────────────────────────────

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
      where: { contactId, direction: 'in', status: { not: 'read' } },
      data: { status: 'read' },
    });
  }

  // ── Chatbot Rules ──────────────────────────────────────────────────────────

  async listChatbotRules() {
    return this.prisma.chatbotRule.findMany({ orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }] });
  }

  async createChatbotRule(data: { keyword: string; response: string; matchType?: string; priority?: number }) {
    return this.prisma.chatbotRule.create({ data });
  }

  async updateChatbotRule(id: string, data: Partial<{ keyword: string; response: string; matchType: string; isActive: boolean; priority: number }>) {
    return this.prisma.chatbotRule.update({ where: { id }, data });
  }

  async deleteChatbotRule(id: string) {
    await this.prisma.chatbotRule.delete({ where: { id } });
    return { ok: true };
  }

  async reorderChatbotRules(ids: string[]) {
    await Promise.all(
      ids.map((id, idx) =>
        this.prisma.chatbotRule.update({ where: { id }, data: { priority: ids.length - idx } }),
      ),
    );
    return { ok: true };
  }

  // ── Chatbot Flows ──────────────────────────────────────────────────────────

  async listFlows() {
    const flows = await this.prisma.chatbotFlow.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { sessions: true } },
      },
    });
    return flows.map(f => ({
      ...f,
      sessionCount: f._count.sessions,
    }));
  }

  async createFlow(data: { name: string; description?: string; triggerKeyword: string; matchType?: string }) {
    return this.prisma.chatbotFlow.create({
      data: {
        ...data,
        nodes: [
          { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 }, data: { keyword: data.triggerKeyword, matchType: data.matchType ?? 'CONTAINS' } },
        ],
        edges: [],
      },
    });
  }

  async getFlow(id: string) {
    const flow = await this.prisma.chatbotFlow.findUnique({ where: { id } });
    if (!flow) throw new NotFoundException('Flow not found');
    return flow;
  }

  async updateFlow(id: string, data: { name?: string; description?: string; triggerKeyword?: string; matchType?: string; isActive?: boolean; nodes?: any; edges?: any }) {
    return this.prisma.chatbotFlow.update({ where: { id }, data });
  }

  async deleteFlow(id: string) {
    await this.prisma.chatbotFlow.delete({ where: { id } });
    return { ok: true };
  }

  async toggleFlow(id: string) {
    const flow = await this.prisma.chatbotFlow.findUnique({ where: { id } });
    if (!flow) throw new NotFoundException('Flow not found');
    return this.prisma.chatbotFlow.update({ where: { id }, data: { isActive: !flow.isActive } });
  }
}
