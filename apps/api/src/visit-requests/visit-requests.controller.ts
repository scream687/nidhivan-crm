import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VisitRequestsService } from './visit-requests.service';

@Controller('visit-requests')
@UseGuards(AuthGuard('jwt'))
export class VisitRequestsController {
  constructor(private readonly service: VisitRequestsService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.service.findAll(status);
  }

  @Patch(':id')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.service.updateStatus(id, body.status);
  }
}
