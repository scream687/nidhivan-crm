import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CopilotService } from './copilot.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('ai/copilot')
@UseGuards(AuthGuard('jwt'))
export class CopilotController {
  constructor(private copilot: CopilotService) {}

  @Post('chat')
  chat(@Body('message') message: string, @CurrentUser('id') userId: string) {
    return this.copilot.chat(message, userId);
  }

  @Post('call-summary/:leadId')
  generateCallSummary(@Param('leadId') leadId: string, @Body('notes') notes: string) {
    return this.copilot.generateCallSummary(leadId, notes);
  }

  @Get('deal-risk/:leadId')
  assessDealRisk(@Param('leadId') leadId: string) {
    return this.copilot.assessDealRisk(leadId);
  }

  @Post('follow-up/:leadId')
  generateFollowUp(@Param('leadId') leadId: string, @Body('channel') channel: 'CALL' | 'WHATSAPP' | 'EMAIL') {
    return this.copilot.generateFollowUp(leadId, channel);
  }
}
