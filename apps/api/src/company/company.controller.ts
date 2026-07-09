import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CompanyService } from './company.service';

@Controller('settings/company')
export class CompanyController {
  constructor(private company: CompanyService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  get() {
    return this.company.getCompany();
  }

  @Put()
  @UseGuards(AuthGuard('jwt'))
  upsert(@Body() body: { name?: string; address?: string; phone?: string; email?: string; gstin?: string; reraNumber?: string }) {
    return this.company.upsertCompany(body);
  }
}
