import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join, extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
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
  constructor(private siteVisits: SiteVisitsService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.siteVisits.findAll(user);
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
    storage: diskStorage({
      destination: join(process.cwd(), 'public', 'uploads', 'site-visits'),
      filename: (_req, file, cb) => {
        const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
        cb(null, name);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) return cb(new BadRequestException('Only images allowed'), false);
      cb(null, true);
    },
  }))
  uploadPhoto(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const url = `/uploads/site-visits/${file.filename}`;
    return { url };
  }

  @Post(':id/voice-note')
  @UseInterceptors(FileInterceptor('audio', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = join(process.cwd(), 'public', 'uploads', 'voice');
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
        cb(null, name);
      },
    }),
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
    const url = `/uploads/voice/${file.filename}`;
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
