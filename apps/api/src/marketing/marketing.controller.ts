import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
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
}
