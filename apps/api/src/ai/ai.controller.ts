import { Controller, Post, Get, Param, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AiService } from "./ai.service";

@Controller("ai")
@UseGuards(AuthGuard("jwt"))
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post("score/:leadId")
  calculateLeadScore(@Param("leadId") leadId: string) {
    return this.ai.calculateLeadScore(leadId);
  }

  @Get("score/:leadId/breakdown")
  getLeadScoreBreakdown(@Param("leadId") leadId: string) {
    return this.ai.getLeadScoreBreakdown(leadId);
  }

  @Post("score/batch")
  batchScoreLeads(@Query("limit") limit?: string) {
    return this.ai.batchScoreLeads(limit ? parseInt(limit, 10) : undefined);
  }

  @Get("match/:leadId")
  suggestPropertyMatch(@Param("leadId") leadId: string) {
    return this.ai.suggestPropertyMatch(leadId);
  }

  @Get("follow-up-suggestions/:leadId")
  getFollowUpSuggestions(@Param("leadId") leadId: string) {
    return this.ai.getFollowUpSuggestions(leadId);
  }

  @Get("call-summary/:leadId")
  getCallSummaryPlaceholder(@Param("leadId") leadId: string) {
    return this.ai.getCallSummaryPlaceholder(leadId);
  }
}
