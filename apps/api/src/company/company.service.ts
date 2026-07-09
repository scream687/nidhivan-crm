import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompanyService {
  constructor(private prisma: PrismaService) {}

  async getCompany() {
    const company = await this.prisma.company.findFirst();
    return company ?? {};
  }

  async upsertCompany(data: { name?: string; address?: string; phone?: string; email?: string; gstin?: string; reraNumber?: string }) {
    const existing = await this.prisma.company.findFirst();
    if (existing) {
      return this.prisma.company.update({
        where: { id: existing.id },
        data,
      });
    }
    return this.prisma.company.create({ data });
  }
}
