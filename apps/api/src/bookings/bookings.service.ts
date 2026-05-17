import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: { projectId?: string; agentId?: string; status?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const where: any = {};
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.agentId) where.agentId = filters.agentId;
    if (filters.status) where.status = filters.status;

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { bookingDate: 'desc' },
        include: {
          lead: { select: { id: true, name: true, phone: true, leadNumber: true } },
          project: { select: { id: true, name: true, location: true } },
          agent: { select: { id: true, name: true } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        lead: { select: { id: true, name: true, phone: true, email: true, leadNumber: true } },
        project: { select: { id: true, name: true, location: true, city: true } },
        agent: { select: { id: true, name: true, phone: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async create(data: {
    leadId: string; projectId: string; unitNumber: string; unitType?: string;
    unitArea?: number; basePrice: number; bookingAmount: number; totalAmount: number;
    notes?: string; agentId: string; paymentPlan?: any;
  }) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `BK-${dateStr}-${rand}`;

    const booking = await this.prisma.booking.create({
      data: {
        bookingNumber,
        leadId: data.leadId,
        projectId: data.projectId,
        unitNumber: data.unitNumber,
        unitType: data.unitType || 'PLOT',
        unitArea: data.unitArea,
        basePrice: data.basePrice,
        bookingAmount: data.bookingAmount,
        totalAmount: data.totalAmount,
        notes: data.notes,
        agentId: data.agentId,
        paymentPlan: data.paymentPlan,
        status: 'CONFIRMED',
      },
      include: {
        lead: { select: { id: true, name: true, phone: true, leadNumber: true } },
        project: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true } },
      },
    });

    // Update lead stage to BOOKING_PENDING
    await this.prisma.lead.update({
      where: { id: data.leadId },
      data: { stage: 'BOOKING_PENDING', bookingDate: date, bookingAmount: data.bookingAmount },
    });

    // Increment project booked count
    await this.prisma.project.update({
      where: { id: data.projectId },
      data: { booked: { increment: 1 }, available: { decrement: 1 } },
    });

    return booking;
  }

  async update(id: string, data: Partial<{
    unitNumber: string; unitType: string; unitArea: number;
    basePrice: number; bookingAmount: number; totalAmount: number;
    notes: string; paymentPlan: any;
  }>) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    return this.prisma.booking.update({ where: { id }, data });
  }

  async cancel(id: string, reason?: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    await this.prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED', notes: reason ? `Cancelled: ${reason}` : booking.notes },
    });

    // Restore project counts
    await this.prisma.project.update({
      where: { id: booking.projectId },
      data: { booked: { decrement: 1 }, available: { increment: 1 } },
    });

    return { success: true };
  }

  async getStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, thisMonth, revenue] = await Promise.all([
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { createdAt: { gte: startOfMonth }, status: { not: 'CANCELLED' } } }),
      this.prisma.booking.aggregate({
        where: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      total,
      thisMonth,
      totalRevenue: revenue._sum.totalAmount || 0,
    };
  }
}
