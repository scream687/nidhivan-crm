import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SiteVisitsService } from './site-visits.service';
import { R2Service } from '../common/services/r2.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role, User } from '@prisma/client';

const SITE_VISIT_STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

@Controller('leads/:leadId/site-visits')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LeadSiteVisitsController {
  constructor(private siteVisits: SiteVisitsService) {}

  @Post()
  schedule(
    @Param('leadId') leadId: string,
    @Body() data: { scheduledAt: string; address: string; propertyShown?: string; driverName?: string; driverPhone?: string; pickupLocation?: string; pickupTime?: string },
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
  constructor(
    private siteVisits: SiteVisitsService,
    private r2: R2Service,
  ) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.siteVisits.findAll(user);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() data: { status: string },
  ) {
    // SiteVisit.status is a free-text column in the schema, so the allowlist is enforced here.
    if (!SITE_VISIT_STATUSES.includes(data?.status)) {
      throw new BadRequestException(
        `status must be one of: ${SITE_VISIT_STATUSES.join(', ')}`,
      );
    }
    return this.siteVisits.updateStatus(id, data.status);
  }

  @Post(':id/checkin')
  checkin(
    @Param('id') id: string,
    @Body() data: { gpsLatitude: number; gpsLongitude: number },
  ) {
    return this.siteVisits.checkin(id, data);
  }

  @Post(':id/photos')
  addPhotos(
    @Param('id') id: string,
    @Body() data: { photoUrls: string[] },
  ) {
    return this.siteVisits.addPhotos(id, data);
  }

  @Post(':id/photos/upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) return cb(new BadRequestException('Only images allowed'), false);
      cb(null, true);
    },
  }))
  async uploadPhoto(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const key = this.r2.buildKey(`site-visits/${id}`, file.originalname, 'photo');
    await this.r2.upload(key, file.buffer, file.mimetype);
    return { url: await this.r2.urlFor(key) };
  }

  @Post(':id/voice-note')
  @UseInterceptors(FileInterceptor('audio', {
    storage: memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('audio/')) return cb(new BadRequestException('Only audio files allowed'), false);
      cb(null, true);
    },
  }))
  async addVoiceNote(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('duration') duration?: string,
  ) {
    if (!file) throw new BadRequestException('No audio file uploaded');
    const key = this.r2.buildKey(`voice/site-visits/${id}`, file.originalname, 'note');
    await this.r2.upload(key, file.buffer, file.mimetype);
    const url = await this.r2.urlFor(key);
    return this.siteVisits.addVoiceNote(id, url, duration ? parseFloat(duration) : undefined);
  }

  @Get('calendar')
  getCalendar(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.siteVisits.getCalendar(startDate, endDate);
  }
}
