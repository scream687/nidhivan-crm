import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, UploadedFile, UseInterceptors, Res, Header
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto, ChangeStageDto, AssignLeadDto } from './dto/update-lead.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('leads')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LeadsController {
  constructor(private leads: LeadsService) {}

  @Post()
  create(@Body() dto: CreateLeadDto, @CurrentUser('id') userId: string) {
    return this.leads.create(dto, userId);
  }

  @Get()
  findAll(@CurrentUser() user: any, @Query() query: any) {
    return this.leads.findAll(user, {
      stage: query.stage,
      stages: query.stages ? (Array.isArray(query.stages) ? query.stages : query.stages.split(',')) : undefined,
      source: query.source,
      assignedToId: query.assignedToId,
      isHot: query.isHot === 'true' ? true : query.isHot === 'false' ? false : undefined,
      search: query.search,
      city: query.city,
      budgetMin: query.budgetMin ? parseFloat(query.budgetMin) : undefined,
      budgetMax: query.budgetMax ? parseFloat(query.budgetMax) : undefined,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      tags: query.tags ? (Array.isArray(query.tags) ? query.tags : query.tags.split(',')) : undefined,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 50,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @Get('kanban')
  kanban(@CurrentUser() user: any) {
    return this.leads.findKanban(user);
  }

  @Get('kpis')
  kpis(@CurrentUser() user: any) {
    return this.leads.getDashboardKpis(user);
  }

  @Get('duplicates')
  @Roles(Role.ADMIN, Role.MANAGER)
  getDuplicates() {
    return this.leads.getDuplicates();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.leads.findOne(id, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto, @CurrentUser('id') userId: string) {
    return this.leads.update(id, dto, userId);
  }

  @Patch(':id/stage')
  changeStage(@Param('id') id: string, @Body() dto: ChangeStageDto, @CurrentUser('id') userId: string) {
    return this.leads.changeStage(id, dto, userId);
  }

  @Patch(':id/assign')
  assign(@Param('id') id: string, @Body() dto: AssignLeadDto, @CurrentUser('id') userId: string) {
    return this.leads.assign(id, dto, userId);
  }

  @Patch(':id/hot')
  markHot(@Param('id') id: string, @Body('isHot') isHot: boolean, @CurrentUser('id') userId: string) {
    return this.leads.markHot(id, isHot, userId);
  }

  @Get('export/csv')
  async exportCsv(@CurrentUser() user: any, @Res() res: Response) {
    const csv = await this.leads.exportLeads(user);
    const filename = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Post('import/csv')
  @Roles(Role.ADMIN, Role.MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(@UploadedFile() file: Express.Multer.File, @CurrentUser('id') userId: string) {
    if (!file) throw new Error('No file uploaded');
    const text = file.buffer.toString('utf-8');
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return { created: 0, skipped: 0, errors: ['File is empty or has no data rows'] };

    // Parse CSV header → rows
    const headers = parseCsvLine(lines[0]);
    const rows = lines.slice(1).map((line) => {
      const vals = parseCsvLine(line);
      return Object.fromEntries(headers.map((h, i) => [h.trim(), (vals[i] || '').trim()]));
    });

    return this.leads.importLeads(rows, userId);
  }

  @Post(':id/merge/:duplicateId')
  @Roles(Role.ADMIN, Role.MANAGER)
  merge(@Param('id') id: string, @Param('duplicateId') dupId: string, @CurrentUser('id') userId: string) {
    return this.leads.mergeLeads(id, dupId, userId);
  }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}
