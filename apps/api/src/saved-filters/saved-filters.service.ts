import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SavedFiltersService {
  constructor(private prisma: PrismaService) {}

  findForUser(userId: string) {
    return this.prisma.savedFilter.findMany({
      where: { OR: [{ userId }, { isShared: true }] },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  create(userId: string, dto: { name: string; filters: any; isShared?: boolean }) {
    return this.prisma.savedFilter.create({
      data: {
        id: require('crypto').randomUUID(),
        userId,
        name: dto.name,
        filters: dto.filters,
        isShared: dto.isShared ?? false,
      },
    });
  }

  async remove(id: string, userId: string, isAdmin: boolean) {
    const filter = await this.prisma.savedFilter.findUnique({ where: { id } });
    if (!filter) throw new NotFoundException('Filter not found');
    if (filter.userId !== userId && !isAdmin) throw new ForbiddenException('Cannot delete another user\'s filter');
    return this.prisma.savedFilter.delete({ where: { id } });
  }
}
