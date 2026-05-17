import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { WhatsAppService } from './whatsapp.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(private whatsapp: WhatsAppService) {}

  // ── Analytics ────────────────────────────────────────────────────────────

  @Get('analytics')
  @UseGuards(AuthGuard('jwt'))
  getAnalytics(@Query('days') days?: string) {
    return this.whatsapp.getAnalytics(days ? +days : 7);
  }

  // ── Config ────────────────────────────────────────────────────────────────

  @Get('config')
  @UseGuards(AuthGuard('jwt'))
  getConfig() {
    return this.whatsapp.getConfig();
  }

  @Post('config')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  saveConfig(@Body() body: {
    phoneNumberId: string;
    wabaId: string;
    accessToken: string;
    verifyToken?: string;
    displayName?: string;
    isActive?: boolean;
  }) {
    return this.whatsapp.saveConfig(body);
  }

  // ── Conversations ─────────────────────────────────────────────────────────

  @Get('conversations')
  @UseGuards(AuthGuard('jwt'))
  getConversations() {
    return this.whatsapp.getConversations();
  }

  @Get('conversations/:contactId/messages')
  @UseGuards(AuthGuard('jwt'))
  getMessages(@Param('contactId') contactId: string) {
    return this.whatsapp.getMessages(contactId);
  }

  // ── Send ──────────────────────────────────────────────────────────────────

  @Post('send')
  @UseGuards(AuthGuard('jwt'))
  send(
    @Body() body: { to: string; body: string },
    @CurrentUser('id') agentId: string,
  ) {
    return this.whatsapp.sendMessage(body.to, body.body, agentId);
  }

  // ── Webhook ───────────────────────────────────────────────────────────────

  @Get('webhook')
  @SkipThrottle()
  async verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const config = await this.whatsapp.getConfig();
    const expectedToken = config?.verifyToken || 'nidhivan_whatsapp_verify';

    if (mode === 'subscribe' && verifyToken === expectedToken) {
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Verification failed');
    }
  }

  @Post('webhook')
  @SkipThrottle()
  @HttpCode(200)
  receiveWebhook(@Body() payload: any) {
    this.logger.log('Received WhatsApp webhook');
    // Fire-and-forget; always return 200 quickly to WhatsApp
    this.whatsapp.handleIncomingWebhook(payload).catch((err) =>
      this.logger.error('Webhook processing error', err),
    );
    return { status: 'ok' };
  }
}
