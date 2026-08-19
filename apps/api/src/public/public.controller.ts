import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PublicService } from './public.service';
import { PublicLeadDto, PublicVisitRequestDto } from './dto/public-lead.dto';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('projects/:slug')
  findProject(@Param('slug') slug: string) {
    return this.publicService.findProjectBySlug(slug);
  }

  // Unauthenticated write: the global 120/min is far too generous for a form
  // anyone on the internet can POST to.
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('projects/:slug/visit-request')
  createVisitRequest(
    @Param('slug') slug: string,
    @Body() body: PublicVisitRequestDto,
  ) {
    return this.publicService.createVisitRequest(slug, body);
  }

  @Get('landing/:slug')
  getLandingPage(@Param('slug') slug: string) {
    return this.publicService.getLandingPage(slug);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('landing/:slug/submit')
  submitLandingPageLead(
    @Param('slug') slug: string,
    @Body() body: PublicLeadDto,
  ) {
    return this.publicService.submitLandingPageLead(slug, body);
  }
}
