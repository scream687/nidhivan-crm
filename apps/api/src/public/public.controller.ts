import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('projects/:slug')
  findProject(@Param('slug') slug: string) {
    return this.publicService.findProjectBySlug(slug);
  }

  @Post('projects/:slug/visit-request')
  createVisitRequest(
    @Param('slug') slug: string,
    @Body() body: { name: string; phone: string; email?: string; preferredDate?: string; message?: string },
  ) {
    return this.publicService.createVisitRequest(slug, body);
  }

  @Get('landing/:slug')
  getLandingPage(@Param('slug') slug: string) {
    return this.publicService.getLandingPage(slug);
  }

  @Post('landing/:slug/submit')
  submitLandingPageLead(
    @Param('slug') slug: string,
    @Body() body: { name: string; phone: string; email?: string; message?: string },
  ) {
    return this.publicService.submitLandingPageLead(slug, body);
  }
}
