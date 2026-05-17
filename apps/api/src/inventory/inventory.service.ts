import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.project.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.project.findUnique({ where: { id } });
  }

  create(data: {
    name: string; type?: string; location: string; city?: string;
    totalUnits: number; available?: number; pricePerSqft?: number;
    reraNumber?: string; description?: string;
  }) {
    return this.prisma.project.create({
      data: {
        name: data.name,
        type: data.type || 'PLOT',
        location: data.location,
        city: data.city || 'Jaipur',
        totalUnits: data.totalUnits,
        available: data.available ?? data.totalUnits,
        pricePerSqft: data.pricePerSqft ?? undefined,
        reraNumber: data.reraNumber,
        description: data.description,
      },
    });
  }

  async update(id: string, data: Partial<{
    name: string; type: string; location: string; city: string;
    totalUnits: number; available: number; blocked: number;
    booked: number; sold: number; pricePerSqft: number;
    reraNumber: string; description: string; isActive: boolean;
  }>) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    return this.prisma.project.update({ where: { id }, data });
  }

  async remove(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    return this.prisma.project.update({ where: { id }, data: { isActive: false } });
  }

  async updateUnitStatus(id: string, status: 'available' | 'blocked' | 'booked' | 'sold', delta: number) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    return this.prisma.project.update({
      where: { id },
      data: { [status]: { increment: delta } },
    });
  }
}
