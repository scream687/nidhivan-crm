import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  Headers,
  HttpCode,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { IntegrationsService } from './integrations.service';
import { PORTALS, isPortalSlug } from './portal-sources';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

// Portals POST from their own infrastructure, so the browser-oriented global
// limit does not apply — but an unauthenticated endpoint still needs a ceiling.
const WEBHOOK_THROTTLE = { default: { ttl: 60_000, limit: 60 } };

@Controller('integrations')
export class IntegrationsController {
  constructor(private integrations: IntegrationsService) {}

  // ── Portal webhooks ──────────────────────────────────────────────────────

  /**
   * Housing.com / 99acres / MagicBricks / Webflow lead push.
   * The secret may travel as a header or a query param: several portal consoles
   * only accept a bare URL with no custom headers.
   */
  @Post('leads/:source')
  @HttpCode(200)
  @Throttle(WEBHOOK_THROTTLE)
  async handlePortalLead(
    @Param('source') source: string,
    @Body() payload: any,
    @Headers('x-nidhivan-token') headerToken?: string,
    @Query('token') queryToken?: string,
  ) {
    const slug = source.toLowerCase();
    if (!isPortalSlug(slug)) {
      throw new BadRequestException(
        `Unknown lead source '${source}'. Expected one of: ${Object.keys(PORTALS).join(', ')}`,
      );
    }

    const authorized = await this.integrations.verifyWebhookSecret(
      PORTALS[slug].configType,
      headerToken || queryToken,
    );
    if (!authorized) throw new UnauthorizedException('Invalid or missing webhook token');

    return this.integrations.handlePortalLead(slug, payload);
  }

  // ── Facebook Lead Ads ────────────────────────────────────────────────────

  @Post('facebook')
  @HttpCode(200)
  @SkipThrottle()
  async handleFacebook(
    @Req() req: any,
    @Body() payload: any,
    @Headers('x-hub-signature-256') signature?: string,
  ) {
    const valid = await this.integrations.verifyFacebookSignature(req.rawBody, signature);
    if (!valid) throw new UnauthorizedException('Invalid X-Hub-Signature-256');

    return this.integrations.handleFacebookLead(payload);
  }

  @Get('facebook')
  @SkipThrottle()
  async verifyFacebook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const expected = await this.integrations.getFacebookVerifyToken();
    if (!expected) throw new UnauthorizedException('Facebook verify token is not configured');
    if (mode !== 'subscribe' || token !== expected) {
      throw new UnauthorizedException('Verification failed');
    }
    return challenge;
  }

  // ── Admin: config, status, logs ──────────────────────────────────────────

  @Get('status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  getStatus() {
    return this.integrations.getStatus();
  }

  @Get('deliveries')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  getDeliveries(@Query('source') source?: string, @Query('take') take?: string) {
    return this.integrations.getDeliveries(source, take ? +take : 50);
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

  @Post('config/:type/secret')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  rotateSecret(@Param('type') type: string) {
    return this.integrations.rotateWebhookSecret(type.toUpperCase());
  }

  /**
   * Emails the portal's account manager the endpoint and setup instructions.
   * Keeps the secret-bearing URL inside the app rather than making an admin
   * paste it into their own mail client.
   */
  @Post('config/:type/send-setup-email')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  sendSetupEmail(
    @Param('type') type: string,
    @Body() body: { email: string },
    @CurrentUser('name') senderName: string,
  ) {
    return this.integrations.sendSetupEmail(
      type.toUpperCase(),
      (body?.email || '').trim(),
      senderName || 'Nidhivan CRM',
    );
  }

  @Post('facebook/verify')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  verifyFacebookCredentials() {
    return this.integrations.verifyFacebookCredentials();
  }

  /**
   * Dry run: maps a sample payload exactly as the live webhook would, without
   * persisting a lead. Replaces the old browser-side "Test Webhook", which was
   * blocked by CORS and would have written junk into production if it worked.
   */
  @Post('test/:source')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  testMapping(@Param('source') source: string, @Body() payload: any) {
    const slug = source.toLowerCase();
    if (!isPortalSlug(slug)) {
      throw new BadRequestException(
        `Unknown lead source '${source}'. Expected one of: ${Object.keys(PORTALS).join(', ')}`,
      );
    }
    return this.integrations.mapPortalPayload(slug, payload);
  }
}
