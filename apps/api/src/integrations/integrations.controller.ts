import { Controller, Post, Get, Body, Query, Param, HttpCode, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SkipThrottle } from '@nestjs/throttler';
import { IntegrationsService } from './integrations.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('integrations')
export class IntegrationsController {
  constructor(private integrations: IntegrationsService) {}

  @Post('webflow')
  @HttpCode(200)
  @SkipThrottle()
  handleWebflow(@Body() payload: any) {
    return this.integrations.handleWebflowLead(payload);
  }

  @Post('facebook')
  @HttpCode(200)
  @SkipThrottle()
  handleFacebook(@Body() payload: any) {
    return this.integrations.handleFacebookLead(payload);
  }

  @Get('facebook')
  @SkipThrottle()
  verifyFacebook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'nidhivan_secret';
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return challenge;
    }
    return 'Verification failed';
  }

  @Get('config/:type')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  getConfig(@Param('type') type: string) {
    return this.integrations.getIntegrationConfig(type.toUpperCase());
  }

  @Post('config/:type')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  upsertConfig(
    @Param('type') type: string,
    @Body() body: { accessToken?: string; metadata?: any },
  ) {
    return this.integrations.upsertIntegrationConfig(type.toUpperCase(), body);
  }
}
