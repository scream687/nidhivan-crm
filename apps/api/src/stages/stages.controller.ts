import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StagesService } from './stages.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('stages')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class StagesController {
  constructor(private stages: StagesService) {}

  @Get()
  findAll() {
    return this.stages.findAll();
  }

  @Get('active')
  findActive() {
    return this.stages.findActive();
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  create(@Body() dto: any) {
    return this.stages.create(dto);
  }

  @Patch('reorder')
  @Roles(Role.ADMIN, Role.MANAGER)
  reorder(@Body() body: { items: { id: string; order: number }[] }) {
    return this.stages.reorder(body.items);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  update(@Param('id') id: string, @Body() dto: any) {
    return this.stages.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.stages.remove(id);
  }
}
