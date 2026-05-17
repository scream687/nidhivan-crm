import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: any) {
    return this.users.findOne(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: any, @Body() body: { name?: string; phone?: string }) {
    return this.users.updateSelf(user.id, body);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() body: any) {
    return this.users.create(body);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  findAll() {
    return this.users.findAll();
  }

  @Get('leaderboard')
  @Roles(Role.ADMIN, Role.MANAGER)
  leaderboard() {
    return this.users.getLeaderboard();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.users.getStats(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() body: any) {
    return this.users.update(id, body);
  }

  @Patch(':id/password')
  changePassword(@Param('id') id: string, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.users.changePassword(id, body.currentPassword, body.newPassword);
  }
}
