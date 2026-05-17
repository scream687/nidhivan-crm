import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SavedFiltersService } from './saved-filters.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('saved-filters')
@UseGuards(AuthGuard('jwt'))
export class SavedFiltersController {
  constructor(private service: SavedFiltersService) {}

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.service.findForUser(userId);
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: any) {
    return this.service.create(userId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    const isAdmin = user.role === Role.ADMIN || user.role === Role.MANAGER;
    return this.service.remove(id, user.id, isAdmin);
  }
}
