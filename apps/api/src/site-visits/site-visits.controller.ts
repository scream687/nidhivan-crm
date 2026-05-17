import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SiteVisitsService } from './site-visits.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { User } from '@prisma/client';

@Controller('site-visits')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SiteVisitsController {
  constructor(private siteVisits: SiteVisitsService) {}

  @Post('schedule/:leadId')
  schedule(
    @Param('leadId') leadId: string,
    @Body() data: { project: string; visitDate: string; assignedToId: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.siteVisits.schedule(leadId, data, userId);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.siteVisits.findAll(user);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() data: { status: string; feedback?: string; rating?: number },
    @CurrentUser('id') userId: string,
  ) {
    return this.siteVisits.updateStatus(id, data.status, data.feedback, data.rating, userId);
  }
}
