import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StagesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.stageConfig.findMany({ orderBy: { order: 'asc' } });
  }

  findActive() {
    return this.prisma.stageConfig.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } });
  }

  async create(dto: {
    name: string; label: string; color?: string; bgColor?: string;
    order?: number; isWon?: boolean; isLost?: boolean;
  }) {
    const existing = await this.prisma.stageConfig.findUnique({ where: { name: dto.name } });
    if (existing) throw new BadRequestException(`Stage "${dto.name}" already exists`);

    const maxOrder = await this.prisma.stageConfig.aggregate({ _max: { order: true } });
    return this.prisma.stageConfig.create({
      data: {
        id: require('crypto').randomUUID(),
        name: dto.name.toUpperCase().replace(/\s+/g, '_'),
        label: dto.label,
        color: dto.color || '#6b7280',
        bgColor: dto.bgColor || '#f3f4f6',
        order: dto.order ?? (maxOrder._max.order ?? 0) + 1,
        isWon: dto.isWon ?? false,
        isLost: dto.isLost ?? false,
        isSystem: false,
        isActive: true,
      },
    });
  }

  async update(id: string, dto: {
    label?: string; color?: string; bgColor?: string;
    order?: number; isWon?: boolean; isLost?: boolean; isActive?: boolean;
  }) {
    const stage = await this.prisma.stageConfig.findUnique({ where: { id } });
    if (!stage) throw new NotFoundException('Stage not found');
    return this.prisma.stageConfig.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const stage = await this.prisma.stageConfig.findUnique({ where: { id } });
    if (!stage) throw new NotFoundException('Stage not found');
    if (stage.isSystem) throw new BadRequestException('Cannot delete a system stage');

    const leadsCount = await this.prisma.lead.count({ where: { stage: stage.name } });
    if (leadsCount > 0) throw new BadRequestException(`Cannot delete stage — ${leadsCount} lead(s) are currently in this stage`);

    return this.prisma.stageConfig.delete({ where: { id } });
  }

  async reorder(items: { id: string; order: number }[]) {
    await this.prisma.$transaction(
      items.map((item) => this.prisma.stageConfig.update({ where: { id: item.id }, data: { order: item.order } })),
    );
    return this.findAll();
  }
}
