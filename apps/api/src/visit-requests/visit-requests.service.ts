import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VisitRequestsService {
  constructor(private prisma: PrismaService) {}

  findAll(status?: string) {
    return this.prisma.siteVisitRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        project: { select: { id: true, name: true, location: true, slug: true, city: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: string) {
    const req = await this.prisma.siteVisitRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Visit request not found');
    return this.prisma.siteVisitRequest.update({ where: { id }, data: { status } });
  }
}
