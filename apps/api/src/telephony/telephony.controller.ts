import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Param,
  HttpCode,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { TelephonyService } from './telephony.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

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

  // ── Exotel webhooks ──────────────────────────────────────────────────────
  // Called by Exotel's servers, so no JWT. The secret in the path is what
  // stops anyone on the internet from POSTing fabricated call logs.

  // Exotel's Passthru applet sends call details as query parameters on a GET,
  // which is why the previous CRM's URL looked like "...php?appid=...". Both
  // verbs are accepted, and query and body are merged, so the applet works
  // whichever way it is configured.
  @Get('exotel/passthru/:secret')
  @Post('exotel/passthru/:secret')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  async handlePassthru(
    @Param('secret') secret: string,
    @Body() body: any,
    @Query() query: any,
  ) {
    if (!(await this.telephony.verifyPassthruSecret(secret))) {
      throw new UnauthorizedException('Invalid webhook secret');
    }
    return this.telephony.handleExotelPassthru({ ...(query || {}), ...(body || {}) });
  }

  /**
   * Incoming call to the ExoPhone. Returns 200, which the Passthru applet
   * treats as "continue down Choice A" — do not change the status code without
   * checking the call flow configured in the Exotel dashboard.
   */
  @Get('exotel/incoming/:secret')
  @Post('exotel/incoming/:secret')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  async handleIncoming(
    @Param('secret') secret: string,
    @Body() body: any,
    @Query() query: any,
  ) {
    if (!(await this.telephony.verifyPassthruSecret(secret))) {
      throw new UnauthorizedException('Invalid webhook secret');
    }
    // Body wins on conflict: a POST body is the more deliberate carrier.
    return this.telephony.handleIncomingCall({ ...(query || {}), ...(body || {}) });
  }

  // ── Config (admin only — these read and write the Exotel API token) ───────

  @Get('config')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  getConfig() {
    return this.telephony.getConfig();
  }

  @Post('config')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  saveConfig(
    @Body()
    body: {
      exotelApiKey?: string;
      exotelSid?: string;
      exotelToken?: string;
      exotelPhone?: string;
      virtualNumber?: string;
      subdomain?: string;
      ivrLeadOwnerId?: string;
    },
  ) {
    return this.telephony.saveConfig(body);
  }

  @Post('test-connection')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  testConnection() {
    return this.telephony.testConnection();
  }
}
