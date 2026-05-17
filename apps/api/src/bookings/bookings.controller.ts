import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { BookingsService } from './bookings.service';

@Controller('bookings')
@UseGuards(AuthGuard('jwt'))
export class BookingsController {
  constructor(private bookings: BookingsService) {}

  @Get('stats')
  getStats() {
    return this.bookings.getStats();
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

  @Post(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  cancel(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.bookings.cancel(id, reason);
  }
}
