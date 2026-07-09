import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NimClientService } from "./nim-client.service";

const SOURCE_SCORES: Record<string, number> = {
  WALK_IN: 15,
  WEBSITE: 12,
  REFERRAL: 12,
  BROKER_REFERRAL: 10,
  FACEBOOK: 8,
  INSTAGRAM: 8,
  GOOGLE_ADS: 8,
  WHATSAPP: 6,
  HOUSING_COM: 6,
  NINETYNINE_ACRES: 6,
  OTHER: 5,
};

const STAGE_SCORES: Record<string, number> = {
  NEW: 2,
  CONTACTED: 5,
  SITE_VISIT_SCHEDULED: 8,
  SITE_VISIT_DONE: 12,
  FOLLOW_UP: 10,
  NEGOTIATION: 15,
  BOOKED: 20,
  CLOSED_WON: 20,
  CLOSED_LOST: 0,
  DUPLICATE: 0,
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  constructor(
    private prisma: PrismaService,
    private nim: NimClientService,
  ) {}

  async calculateLeadScore(leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        _count: { select: { activities: true, callLogs: true, siteVisits: true } },
        whatsappContacts: { select: { _count: { select: { messages: true } } } },
      },
    });
    if (!lead) throw new NotFoundException("Lead not found");

    const breakdown = this.computeBreakdown(lead);
    const total = Math.min(
      breakdown.budgetFit.score +
        breakdown.sourceQuality.score +
        breakdown.engagement.score +
        breakdown.stageProgression.score +
        breakdown.recency.score +
        breakdown.priority.score,
      100,
    );

    await this.prisma.lead.update({
      where: { id: leadId },
      data: { aiScore: total },
    });

    return { score: total, breakdown };
  }

  async getLeadScoreBreakdown(leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        _count: { select: { activities: true, callLogs: true, siteVisits: true } },
        whatsappContacts: { select: { _count: { select: { messages: true } } } },
      },
    });
    if (!lead) throw new NotFoundException("Lead not found");

    return this.computeBreakdown(lead);
  }

  async batchScoreLeads(limit = 50) {
    const leads = await this.prisma.lead.findMany({
      where: { aiScore: null },
      take: limit,
      include: {
        _count: { select: { activities: true, callLogs: true, siteVisits: true } },
        whatsappContacts: { select: { _count: { select: { messages: true } } } },
      },
    });

    const updates = leads.map((lead) => {
      const breakdown = this.computeBreakdown(lead);
      const total = Math.min(
        breakdown.budgetFit.score +
          breakdown.sourceQuality.score +
          breakdown.engagement.score +
          breakdown.stageProgression.score +
          breakdown.recency.score +
          breakdown.priority.score,
        100,
      );
      return this.prisma.lead.update({
        where: { id: lead.id },
        data: { aiScore: total },
      });
    });

    await this.prisma.$transaction(updates);
    return { scored: leads.length };
  }

  async suggestPropertyMatch(leadId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException("Lead not found");

    const projects = await this.prisma.project.findMany({
      where: {
        isActive: true,
        isPublished: true,
        available: { gt: 0 },
      },
    });

    const budget = lead.budget ? Number(lead.budget) : null;
    const city = lead.city || "";
    const interest = (lead.projectInterest || "").toLowerCase();

    const scored = projects.map((p) => {
      let budgetScore = 0;
      if (budget) {
        const pMin = p.priceMin ? Number(p.priceMin) : 0;
        const pMax = p.priceMax ? Number(p.priceMax) : Infinity;
        if (budget >= pMin && budget <= pMax) {
          budgetScore = 40;
        } else if (budget >= pMin * 0.7 && budget <= pMax * 1.3) {
          budgetScore = 20;
        }
      } else {
        budgetScore = 20;
      }

      let cityScore = 0;
      if (city && p.city.toLowerCase().includes(city.toLowerCase())) {
        cityScore = 30;
      }

      const pctAvail =
        p.totalUnits > 0 ? Math.round((p.available / p.totalUnits) * 100) : 0;
      let availScore = 0;
      if (pctAvail > 50) availScore = 30;
      else if (pctAvail > 20) availScore = 20;
      else if (pctAvail > 0) availScore = 10;

      let interestBonus = 0;
      if (interest && p.name.toLowerCase().includes(interest)) {
        interestBonus = 15;
      }

      const total = Math.min(budgetScore + cityScore + availScore + interestBonus, 100);

      return {
        projectId: p.id,
        name: p.name,
        location: p.location,
        city: p.city,
        priceMin: p.priceMin,
        priceMax: p.priceMax,
        available: p.available,
        matchPercentage: total,
      };
    });

    return scored.sort((a, b) => b.matchPercentage - a.matchPercentage).slice(0, 3);
  }

  async getFollowUpSuggestions(leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { _count: { select: { siteVisits: true, bookings: true } } },
    });
    if (!lead) throw new NotFoundException("Lead not found");

    const daysSinceContact = lead.lastContactedAt
      ? Math.floor(
          (Date.now() - new Date(lead.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24),
        )
      : null;

    if (lead.stage === "BOOKED" || lead._count.bookings > 0) {
      return {
        suggestedAction: "Schedule handover/possession follow-up",
        suggestedType: "CALL",
        suggestedMessage:
          "Hi " +
          lead.name +
          ", congratulations on your booking! We'd like to schedule a handover call to discuss possession timelines. Please let us know your availability.",
        priority: "MEDIUM",
        timing: "Within 7 days",
      };
    }

    if (daysSinceContact === null) {
      return {
        suggestedAction: "Immediate first contact",
        suggestedType: "CALL",
        suggestedMessage:
          "Hi " +
          lead.name +
          ", thank you for your interest in Nidhivan properties. I'd love to discuss your requirements and help find the perfect plot for you. When is a good time to talk?",
        priority: "HIGH",
        timing: "Now",
      };
    }

    const leadScore = lead.aiScore || 0;
    if (leadScore > 70) {
      return {
        suggestedAction: "High-priority follow-up call",
        suggestedType: "CALL",
        suggestedMessage:
          "Hi " +
          lead.name +
          ", I have some exciting updates about our premium plots that match your requirements. Would you like to schedule a site visit this weekend?",
        priority: "HIGH",
        timing: "Within 24 hours",
      };
    }

    if (daysSinceContact > 3) {
      return {
        suggestedAction: "WhatsApp follow-up with site visit offer",
        suggestedType: "WHATSAPP",
        suggestedMessage:
          "Hi " +
          lead.name +
          ", it's been a while since we last spoke! We're running a special site visit this week with exclusive discounts on select plots. Would you like to come by and see the property?",
        priority: "MEDIUM",
        timing: "Today",
      };
    }

    if (lead._count.siteVisits > 0 && lead._count.bookings === 0) {
      return {
        suggestedAction: "Call with special booking offer",
        suggestedType: "CALL",
        suggestedMessage:
          "Hi " +
          lead.name +
          ", I hope you had a great time visiting our property! We have a special launch offer available this week with flexible payment plans. I'd love to discuss the details with you.",
        priority: "HIGH",
        timing: "Today",
      };
    }

    return {
      suggestedAction: "Regular check-in call",
      suggestedType: "CALL",
      suggestedMessage:
        "Hi " +
        lead.name +
        ", just checking in to see if you have any questions about our properties. We have some new inventory that might interest you!",
      priority: "LOW",
      timing: "Within 3 days",
    };
  }

  async getCallSummaryPlaceholder(leadId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException("Lead not found");

    const callLog = await this.prisma.callLog.findFirst({
      where: { leadId },
      orderBy: { createdAt: "desc" },
      select: { id: true, transcription: true, callSummary: true, recordingUrl: true, notes: true, sentimentLabel: true },
    });

    if (!callLog) {
      return {
        hasTranscription: false,
        transcription: null,
        summary: null,
        message: "No call history found for this lead.",
        placeholder: true,
      };
    }

    if (callLog.callSummary) {
      return {
        hasTranscription: true,
        transcription: callLog.transcription,
        summary: callLog.callSummary,
        sentiment: callLog.sentimentLabel,
        message: "AI summary available",
        placeholder: false,
      };
    }

    // Try to generate summary from notes if NIM is available
    if (this.nim.isAvailable() && (callLog.notes || callLog.transcription)) {
      const text = callLog.transcription || callLog.notes || '';
      if (text.length > 10) {
        try {
          const result = await this.nim.structuredChat<{ summary: string; sentiment: string; keyPoints: string[] }>([
            { role: 'system', content: 'Summarize this real estate sales call in 2-3 sentences. Identify sentiment (POSITIVE/NEGATIVE/NEUTRAL) and key points. Respond with JSON: { "summary": "...", "sentiment": "POSITIVE|NEGATIVE|NEUTRAL", "keyPoints": ["..."] }' },
            { role: 'user', content: text },
          ], { temperature: 0.2, maxTokens: 300 });

          await this.prisma.callLog.update({
            where: { id: callLog.id },
            data: { callSummary: result.summary, sentimentLabel: result.sentiment },
          }).catch((e) => console.error('call log summary save', e));

          return {
            hasTranscription: !!callLog.transcription,
            transcription: callLog.transcription,
            summary: result.summary,
            sentiment: result.sentiment,
            keyPoints: result.keyPoints,
            message: "AI summary generated",
            placeholder: false,
          };
        } catch (err) {
          this.logger.warn(`AI summary failed: ${err}`);
          // fall through
        }
      }
    }

    return {
      hasTranscription: false,
      transcription: null,
      summary: null,
      message: this.nim.isAvailable()
        ? "No call notes to summarize."
        : "AI call summary requires NVIDIA NIM API key. Configure in Settings > Integrations.",
      placeholder: true,
    };
  }

  private computeBreakdown(lead: any) {
    const budget = lead.budget ? Number(lead.budget) : 0;
    const budgetScore = budget ? Math.min(Math.round((budget / 50000000) * 20), 20) : 0;

    const sourceQuality = SOURCE_SCORES[lead.source] || SOURCE_SCORES.OTHER;

    let engagement = 0;
    if (lead._count.activities > 0) engagement += 5;
    if (lead._count.callLogs > 0) engagement += 5;
    if (lead._count.siteVisits > 0) engagement += 8;
    const hasWhatsApp =
      lead.whatsappContacts?.some((c: any) => c._count?.messages > 0) ?? false;
    if (hasWhatsApp) engagement += 3;
    if (
      lead.lastContactedAt &&
      Date.now() - new Date(lead.lastContactedAt).getTime() < 7 * 24 * 60 * 60 * 1000
    ) {
      engagement += 4;
    }

    const stageProgression = STAGE_SCORES[lead.stage] || 0;

    const ageDays = (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const recency = ageDays < 30 ? Math.round((1 - ageDays / 30) * 10) : 0;

    let priority = 0;
    if (lead.isHot) priority += 10;
    else if (lead.priority === "HIGH") priority += 5;

    return {
      budgetFit: { score: budgetScore, max: 20, label: "Budget Fit" },
      sourceQuality: { score: sourceQuality, max: 15, label: "Lead Source" },
      engagement: { score: Math.min(engagement, 25), max: 25, label: "Engagement" },
      stageProgression: { score: stageProgression, max: 20, label: "Stage" },
      recency: { score: recency, max: 10, label: "Recency" },
      priority: { score: priority, max: 10, label: "Priority" },
    };
  }
}
