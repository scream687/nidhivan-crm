import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get('lead-aging')
  leadAging() {
    return this.reports.getLeadAgingReport();
  }

  @Get('source-breakdown')
  sourceBreakdown(@Query() q: any) {
    return this.reports.getSourceBreakdown(q.from ? new Date(q.from) : undefined, q.to ? new Date(q.to) : undefined);
  }

  @Get('agent-performance')
  agentPerformance(@Query() q: any) {
    return this.reports.getAgentPerformance(q.from ? new Date(q.from) : undefined, q.to ? new Date(q.to) : undefined);
  }

  @Get('sales-funnel')
  salesFunnel() {
    return this.reports.getSalesFunnel();
  }

  @Get('export/leads')
  async exportLeads(@Query() q: any, @Res() res: Response) {
    const csv = await this.reports.exportLeadsCsv({});
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
    return res.send(csv);
  }
}
