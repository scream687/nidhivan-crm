import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WorkflowsService } from './workflows.service';

@Controller('workflows')
@UseGuards(AuthGuard('jwt'))
export class WorkflowsController {
  constructor(private svc: WorkflowsService) {}

  @Get() list() { return this.svc.list(); }

  @Post()
  create(@Body() body: { name: string; trigger: any; triggerConfig?: any; actions: any[] }) {
    return this.svc.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.svc.delete(id); }
}
