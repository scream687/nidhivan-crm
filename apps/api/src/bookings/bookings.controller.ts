import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { BookingsService } from './bookings.service';
import { R2Service } from '../common/services/r2.service';
import { Response } from 'express';

@Controller('bookings')
@UseGuards(AuthGuard('jwt'))
export class BookingsController {
  constructor(
    private bookings: BookingsService,
    private r2: R2Service,
  ) {}

  @Get('stats')
  getStats() {
    return this.bookings.getStats();
  }

  @Get('dashboard')
  getDashboard() {
    return this.bookings.getBookingsDashboard();
  }

  @Get()
  findAll(@Query() query: any) {
    return this.bookings.findAll({
      projectId: query.projectId,
      agentId: query.agentId,
      status: query.status,
      page: +query.page || 1,
      limit: +query.limit || 50,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookings.findOne(id);
  }

  @Get(':id/timeline')
  getTimeline(@Param('id') id: string) {
    return this.bookings.getBookingTimeline(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES_AGENT)
  create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.bookings.create({ ...body, agentId: body.agentId || userId });
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  update(@Param('id') id: string, @Body() body: any) {
    return this.bookings.update(id, body);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  updateStatus(@Param('id') id: string, @Body() body: { status?: string; registryStatus?: string }) {
    return this.bookings.updateBookingStatus(id, body);
  }

  @Post(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  cancel(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.bookings.cancel(id, reason);
  }

  @Post(':id/documents')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  addDocument(@Param('id') id: string, @Body() body: { type: string; url: string; title: string }) {
    return this.bookings.addDocument(id, body);
  }

  @Delete(':id/documents/:index')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  removeDocument(@Param('id') id: string, @Param('index') index: string) {
    return this.bookings.removeDocument(id, +index);
  }

  @Post(':id/commission/paid')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT)
  markCommissionPaid(@Param('id') id: string, @Body() body: { amount: number; notes?: string }) {
    return this.bookings.markCommissionPaid(id, body);
  }

  @Post(':id/generate-letter')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  generateLetter(@Param('id') id: string) {
    return this.bookings.generateBookingLetter(id);
  }

  // Stays behind auth: the letter contains customer PII, so it is never served
  // from a public bucket. We hand back a short-lived signed R2 URL instead.
  @Get('letters/:fileName')
  @UseGuards(AuthGuard('jwt'))
  async serveLetter(@Param('fileName') fileName: string, @Res() res: Response) {
    const safeName = fileName.replace(/[^A-Za-z0-9._-]/g, '');
    if (!safeName.endsWith('.pdf')) {
      return res.status(400).json({ message: 'Invalid letter name' });
    }
    try {
      const url = await this.r2.urlFor(`letters/${safeName}`, 300);
      return res.redirect(url);
    } catch {
      return res.status(404).json({ message: 'Letter not found' });
    }
  }
}
