import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NimClientService } from './nim-client.service';

@Injectable()
export class CopilotService {
  private readonly logger = new Logger(CopilotService.name);

  constructor(
    private prisma: PrismaService,
    private nim: NimClientService,
  ) {}

  // ── Copilot Chat ──────────────────────────────────────────────────────

  async chat(message: string, userId: string) {
    if (!this.nim.isAvailable()) {
      return { reply: 'AI Copilot requires NVIDIA NIM API key. Configure it in Settings > Integrations.', actions: [] };
    }

    const context = await this.buildContext();
    const systemPrompt = `You are Nidhivan CRM AI Copilot — an intelligent assistant for Indian real estate sales teams.

You have access to the CRM data. Answer questions about leads, deals, pipeline, and revenue.
Be concise, data-driven, and actionable. Use Indian Rupees (₹) for currency.
Current data context:
${context}

When the user asks about specific leads or actions, respond with a JSON actions array:
{ "reply": "natural language response", "actions": [{ "type": "OPEN_LEAD", "leadId": "..." }, { "type": "SCHEDULE_FOLLOWUP", "leadId": "..." }] }

For general questions, just respond with { "reply": "...", "actions": [] }`;

    try {
      const result = await this.nim.structuredChat<{ reply: string; actions?: any[] }>([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ], { temperature: 0.3, maxTokens: 800 });

      return { reply: result.reply, actions: result.actions ?? [] };
    } catch (err: any) {
      this.logger.error(`Copilot chat failed: ${err.message}`);
      return { reply: 'I encountered an error processing your request. Please try again.', actions: [] };
    }
  }

  // ── AI Call Summary ───────────────────────────────────────────────────

  async generateCallSummary(leadId: string, callNotes: string) {
    if (!this.nim.isAvailable()) {
      return { summary: callNotes, sentiment: 'NEUTRAL', keyPoints: [], nextSteps: [] };
    }

    const lead = await this.prisma.lead.findUnique({ where: { id: leadId }, select: { name: true, stage: true, budget: true, city: true } });
    const leadContext = lead ? `Lead: ${lead.name}, Stage: ${lead.stage}, Budget: ${lead.budget}, City: ${lead.city}` : '';

    try {
      const result = await this.nim.structuredChat<{
        summary: string;
        sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
        keyPoints: string[];
        nextSteps: string[];
      }>([
        { role: 'system', content: `You are a real estate call analyst. Summarize the call notes below.
Respond with JSON: { "summary": "2-3 sentence summary", "sentiment": "POSITIVE|NEGATIVE|NEUTRAL", "keyPoints": ["point1", "point2"], "nextSteps": ["step1", "step2"] }
${leadContext}` },
        { role: 'user', content: callNotes },
      ], { temperature: 0.2, maxTokens: 500 });

      // Store summary on the latest call log
      const callLog = await this.prisma.callLog.findFirst({ where: { leadId }, orderBy: { createdAt: 'desc' } });
      if (callLog) {
        await this.prisma.callLog.update({
          where: { id: callLog.id },
          data: { callSummary: result.summary, sentimentScore: result.sentiment === 'POSITIVE' ? 1 : result.sentiment === 'NEGATIVE' ? -1 : 0, sentimentLabel: result.sentiment },
        });
      }

      return result;
    } catch (err: any) {
      this.logger.error(`Call summary failed: ${err.message}`);
      return { summary: callNotes, sentiment: 'NEUTRAL', keyPoints: [], nextSteps: [] };
    }
  }

  // ── Deal Risk Assessment ──────────────────────────────────────────────

  async assessDealRisk(leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        activities: { orderBy: { createdAt: 'desc' }, take: 5 },
        callLogs: { orderBy: { createdAt: 'desc' }, take: 5 },
        siteVisits: { orderBy: { scheduledAt: 'desc' }, take: 3 },
        bookings: { take: 1 },
        _count: { select: { activities: true, callLogs: true, siteVisits: true } },
      },
    });

    if (!lead) return { risk: 'UNKNOWN', score: 0, factors: [], recommendation: 'Lead not found' };

    // Rule-based risk signals
    const factors: string[] = [];
    let riskScore = 0;

    const daysSinceContact = lead.lastContactedAt
      ? Math.floor((Date.now() - new Date(lead.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    if (daysSinceContact !== null && daysSinceContact > 7) {
      factors.push(`No contact in ${daysSinceContact} days`);
      riskScore += 20;
    }
    if (lead._count.callLogs === 0) {
      factors.push('No calls logged');
      riskScore += 15;
    }
    if (lead._count.siteVisits === 0 && lead.stage !== 'NEW') {
      factors.push('No site visit scheduled');
      riskScore += 10;
    }
    if (lead.stage === 'NEGOTIATION' && lead._count.siteVisits > 0 && lead.bookings.length === 0) {
      factors.push('Stalled in negotiation after site visit');
      riskScore += 25;
    }
    if (lead.isHot && daysSinceContact !== null && daysSinceContact > 3) {
      factors.push('Hot lead going cold');
      riskScore += 20;
    }

    const risk = riskScore >= 50 ? 'HIGH' : riskScore >= 25 ? 'MEDIUM' : 'LOW';

    // Enhance with LLM if available
    let recommendation = '';
    if (this.nim.isAvailable() && factors.length > 0) {
      try {
        const result = await this.nim.structuredChat<{ recommendation: string }>([
          { role: 'system', content: 'You are a real estate sales advisor. Given the risk factors below, provide a one-sentence actionable recommendation to save this deal. Respond with JSON: { "recommendation": "..." }' },
          { role: 'user', content: `Lead: ${lead.name}, Stage: ${lead.stage}, Risk: ${risk}, Factors: ${factors.join('; ')}` },
        ], { temperature: 0.3, maxTokens: 200 });
        recommendation = result.recommendation;
      } catch (err) {
        this.logger.warn(`AI recommendation failed: ${err}`);
        // fallback below
      }
    }

    if (!recommendation) {
      if (risk === 'HIGH') recommendation = 'Schedule an immediate follow-up call and offer a site visit incentive.';
      else if (risk === 'MEDIUM') recommendation = 'Send a personalized WhatsApp message with updated inventory.';
      else recommendation = 'Continue regular engagement cadence.';
    }

    return { risk, score: Math.min(riskScore, 100), factors, recommendation };
  }

  // ── Enhanced Follow-up Generation ─────────────────────────────────────

  async generateFollowUp(leadId: string, channel: 'CALL' | 'WHATSAPP' | 'EMAIL') {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        callLogs: { orderBy: { createdAt: 'desc' }, take: 3 },
        siteVisits: { orderBy: { scheduledAt: 'desc' }, take: 2 },
        bookings: { take: 1 },
      },
    });

    if (!lead) return { message: '', timing: 'Now', priority: 'MEDIUM' };

    if (!this.nim.isAvailable()) {
      return { message: `Hi ${lead.name}, following up on your property inquiry. Let me know when you'd like to visit.`, timing: 'Within 24 hours', priority: 'MEDIUM' };
    }

    const callHistory = lead.callLogs.map(c => `${c.sentimentLabel || 'unknown'}: ${c.callSummary || c.notes || 'no notes'}`).join('\n');
    const visitHistory = lead.siteVisits.map(v => `Visit on ${v.scheduledAt?.toLocaleDateString('en-IN')}: outcome=${v.outcome || 'pending'}`).join('\n');

    try {
      const result = await this.nim.structuredChat<{ message: string; timing: string; priority: 'HIGH' | 'MEDIUM' | 'LOW' }>([
        { role: 'system', content: `You are a real estate sales assistant for Nidhivan Property Linkers (Indian market).
Write a ${channel} follow-up message for this lead. Be warm, professional, and specific to their situation.
Use Indian English style. Keep it under 100 words.
Respond with JSON: { "message": "...", "timing": "when to send", "priority": "HIGH|MEDIUM|LOW" }

Lead: ${lead.name}, Stage: ${lead.stage}, Budget: ${lead.budget ? `₹${lead.budget}` : 'unknown'}, City: ${lead.city || 'unknown'}
Call history: ${callHistory || 'none'}
Visit history: ${visitHistory || 'none'}
Booking: ${lead.bookings.length > 0 ? 'has booking' : 'no booking'}` },
        { role: 'user', content: `Generate a ${channel} follow-up for ${lead.name}` },
      ], { temperature: 0.7, maxTokens: 300 });

      return result;
    } catch (err: any) {
      this.logger.error(`Follow-up generation failed: ${err.message}`);
      return { message: `Hi ${lead.name}, just checking in on your property search. Let me know if you have any questions!`, timing: 'Within 24 hours', priority: 'MEDIUM' };
    }
  }

  // ── Context Builder ───────────────────────────────────────────────────

  private async buildContext(): Promise<string> {
    const [totalLeads, hotLeads, recentBookings, pipeline, topAgents] = await Promise.all([
      this.prisma.lead.count(),
      this.prisma.lead.count({ where: { isHot: true } }),
      this.prisma.booking.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } } }),
      this.prisma.lead.groupBy({ by: ['stage'], _count: true, orderBy: { _count: { stage: 'desc' } } }),
      this.prisma.user.findMany({
        where: { role: 'SALES_AGENT' },
        select: { name: true, _count: { select: { assignedLeads: true } } },
        orderBy: { assignedLeads: { _count: 'desc' } },
        take: 3,
      }),
    ]);

    const pipelineStr = pipeline.map(p => `${p.stage}: ${p._count}`).join(', ');
    const agentsStr = topAgents.map(a => `${a.name} (${a._count.assignedLeads} leads)`).join(', ');

    return `Total leads: ${totalLeads}, Hot leads: ${hotLeads}, Bookings this month: ${recentBookings}
Pipeline: ${pipelineStr}
Top agents: ${agentsStr}`;
  }
}
