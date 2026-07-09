import { Controller, Get, Post, Body, Query, UseGuards, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TelephonyService } from './telephony.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CallType } from '@prisma/client';

@Controller('telephony')
export class TelephonyController {
  constructor(private telephony: TelephonyService) {}

  @Post('calls')
  @UseGuards(AuthGuard('jwt'))
  logCall(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.telephony.logCall({ ...body, callerId: userId });
  }

  @Get('calls')
  @UseGuards(AuthGuard('jwt'))
  getCalls(@Query() query: any) {
    return this.telephony.getCalls({ leadId: query.leadId, callerId: query.callerId, page: +query.page, limit: +query.limit });
  }

  @Post('click-to-call')
  @UseGuards(AuthGuard('jwt'))
  clickToCall(@Body() body: { leadId: string }, @CurrentUser('id') userId: string) {
    return this.telephony.clickToCall(body.leadId, userId);
  }

  @Get('analytics')
  @UseGuards(AuthGuard('jwt'))
  getAnalytics(@Query('days') days?: string) {
    return this.telephony.getAnalytics(days ? +days : 7);
  }

  @Get('toppers')
  @UseGuards(AuthGuard('jwt'))
  getToppers(@Query('period') period?: string) {
    return this.telephony.getToppers((period as any) || 'week');
  }

  // Exotel webhook — no auth (called by Exotel servers)
  @Post('exotel/passthru')
  handlePassthru(@Body() body: any) {
    return this.telephony.handleExotelPassthru(body);
  }

  // ── Config ──────────────────────────────────────────────────────────────

  @Get('config')
  @UseGuards(AuthGuard('jwt'))
  getConfig() {
    return this.telephony.getConfig();
  }

  @Post('config')
  @UseGuards(AuthGuard('jwt'))
  saveConfig(@Body() body: { exotelSid: string; exotelToken: string; exotelPhone: string; virtualNumber: string }) {
    return this.telephony.saveConfig(body);
  }
}
