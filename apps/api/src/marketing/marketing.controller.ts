import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MarketingService } from './marketing.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('marketing')
@UseGuards(AuthGuard('jwt'))
export class MarketingController {
  constructor(private svc: MarketingService) {}

  // Segments
  @Get('segments')
  listSegments(@CurrentUser('id') uid: string) { return this.svc.listSegments(uid); }

  @Post('segments')
  createSegment(@Body() body: { name: string; description?: string; filters: any }, @CurrentUser('id') uid: string) {
    return this.svc.createSegment(body, uid);
  }

  @Get('segments/:id/preview')
  previewSegment(@Param('id') id: string) { return this.svc.previewSegment(id); }

  @Delete('segments/:id')
  deleteSegment(@Param('id') id: string) { return this.svc.deleteSegment(id); }

  // Campaigns
  @Get('campaigns')
  listCampaigns() { return this.svc.listCampaigns(); }

  @Post('campaigns')
  createCampaign(@Body() body: any, @CurrentUser('id') uid: string) { return this.svc.createCampaign(body, uid); }

  @Post('campaigns/:id/launch')
  launchCampaign(@Param('id') id: string) { return this.svc.launchCampaign(id); }

  @Patch('campaigns/:id/pause')
  pauseCampaign(@Param('id') id: string) { return this.svc.pauseCampaign(id); }

  @Get('campaigns/:id/stats')
  getCampaignStats(@Param('id') id: string) { return this.svc.getCampaignStats(id); }

  // Attribution
  @Get('attribution')
  getAttribution() { return this.svc.getAttribution(); }

  // Nurture
  @Get('nurture')
  listNurture() { return this.svc.listNurture(); }

  @Post('nurture')
  createNurture(@Body() body: { name: string; triggerStage: string; steps: any[] }) {
    return this.svc.createNurture(body);
  }

  @Patch('nurture/:id')
  updateNurture(@Param('id') id: string, @Body() body: any) { return this.svc.updateNurture(id, body); }

  // Landing Pages
  @Get('landing-pages')
  listLandingPages(@Query('projectId') projectId?: string) { return this.svc.listLandingPages(projectId); }

  @Post('landing-pages')
  createLandingPage(@Body() body: any) { return this.svc.createLandingPage(body); }

  @Get('landing-pages/:id')
  getLandingPage(@Param('id') id: string) { return this.svc.getLandingPageById(id); }

  @Patch('landing-pages/:id')
  updateLandingPage(@Param('id') id: string, @Body() body: any) { return this.svc.updateLandingPage(id, body); }

  @Delete('landing-pages/:id')
  deleteLandingPage(@Param('id') id: string) { return this.svc.deleteLandingPage(id); }

  // Referral Codes
  @Get('referral-codes')
  listReferralCodes(@Query('projectId') projectId?: string) { return this.svc.listReferralCodes(projectId); }

  @Post('referral-codes')
  createReferralCode(@Body() body: any, @CurrentUser('id') uid: string) {
    return this.svc.createReferralCode({ ...body, createdById: uid });
  }

  @Get('referral-codes/:code')
  getReferralByCode(@Param('code') code: string) { return this.svc.getReferralByCode(code); }

  // Reports
  @Get('campaign-roi')
  getCampaignROI(@Query('from') from?: string, @Query('to') to?: string) { return this.svc.getCampaignROI(from, to); }

  @Get('referral-report')
  getReferralReport(@Query('from') from?: string, @Query('to') to?: string) { return this.svc.getReferralReport(from, to); }
}
