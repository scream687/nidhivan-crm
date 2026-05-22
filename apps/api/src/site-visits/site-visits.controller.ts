import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SiteVisitsService } from './site-visits.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role, User } from '@prisma/client';

@Controller('leads/:leadId/site-visits')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LeadSiteVisitsController {
  constructor(private siteVisits: SiteVisitsService) {}

  @Post()
  schedule(
    @Param('leadId') leadId: string,
    @Body() data: { scheduledAt: string; address: string; propertyShown?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.siteVisits.schedule(leadId, data, userId);
  }

  @Get()
  findByLead(@Param('leadId') leadId: string) {
    return this.siteVisits.findByLead(leadId);
  }

  @Get(':visitId')
  findOne(@Param('leadId') leadId: string, @Param('visitId') visitId: string) {
    return this.siteVisits.findOne(leadId, visitId);
  }

  @Patch(':visitId')
  updateOutcome(
    @Param('leadId') leadId: string,
    @Param('visitId') visitId: string,
    @Body() data: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.siteVisits.updateOutcome(leadId, visitId, data, userId);
  }

  @Delete(':visitId')
  @Roles(Role.ADMIN)
  remove(@Param('leadId') leadId: string, @Param('visitId') visitId: string) {
    return this.siteVisits.remove(leadId, visitId);
  }
}

@Controller('site-visits')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SiteVisitsController {
  constructor(private siteVisits: SiteVisitsService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.siteVisits.findAll(user);
  }
}
