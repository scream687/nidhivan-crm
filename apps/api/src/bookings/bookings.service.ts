import { Injectable, NotFoundException } from '@nestjs/common';
import { ActivityType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessMetricsService } from '../metrics/business-metrics.service';
import PDFDocument from 'pdfkit';
import { join } from 'path';
import { createWriteStream, existsSync, mkdirSync } from 'fs';

const leadSelect = { select: { id: true, name: true, phone: true, email: true, leadNumber: true } };
const projectSelect = { select: { id: true, name: true, location: true, city: true } };
const agentSelect = { select: { id: true, name: true, phone: true } };

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private metrics: BusinessMetricsService,
  ) {}

  private include = {
    lead: leadSelect,
    project: projectSelect,
    agent: agentSelect,
  };

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
        include: this.include,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: this.include,
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async getBookingByLeadId(leadId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { leadId },
      include: this.include,
    });
    return booking || null;
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
        bookingTimeline: [{ stage: 'Booking Created', date: date.toISOString(), notes: 'Booking confirmed', by: 'system' }],
      },
      include: this.include,
    });

    await this.prisma.lead.update({
      where: { id: data.leadId },
      data: { stage: 'BOOKING_PENDING', bookingDate: date, bookingAmount: data.bookingAmount },
    });

    await this.prisma.project.update({
      where: { id: data.projectId },
      data: { booked: { increment: 1 }, available: { decrement: 1 } },
    });

    await this.prisma.activity.create({
      data: {
        type: ActivityType.SITE_VISIT,
        title: `Booking created: ${booking.bookingNumber}`,
        description: `Unit ${data.unitNumber} — ₹${Number(data.totalAmount).toLocaleString('en-IN')}`,
        metadata: { bookingId: booking.id, bookingNumber: booking.bookingNumber, totalAmount: data.totalAmount },
        userId: data.agentId,
        leadId: data.leadId,
      },
    });

    this.metrics.onBookingChanged().catch((e) => console.error("async", e));

    return booking;
  }

  async update(id: string, data: Partial<{
    unitNumber: string; unitType: string; unitArea: number;
    basePrice: number; bookingAmount: number; totalAmount: number;
    notes: string; paymentPlan: any;
  }>) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    return this.prisma.booking.update({
      where: { id },
      data,
      include: this.include,
    });
  }

  async cancel(id: string, reason?: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    await this.prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED', notes: reason ? `Cancelled: ${reason}` : booking.notes },
    });

    this.metrics.onBookingChanged().catch((e) => console.error("async", e));

    await this.prisma.project.update({
      where: { id: booking.projectId },
      data: { booked: { decrement: 1 }, available: { increment: 1 } },
    });

    this.metrics.onBookingChanged().catch((e) => console.error("async", e));
    return this.findOne(id);
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

    return { total, thisMonth, totalRevenue: revenue._sum.totalAmount || 0 };
  }

  async getBookingsDashboard() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalBookings, thisMonth, revenue, commissionPending, registryPipeline] = await Promise.all([
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { createdAt: { gte: startOfMonth }, status: { not: 'CANCELLED' } } }),
      this.prisma.booking.aggregate({
        where: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
        _sum: { totalAmount: true },
      }),
      this.prisma.booking.aggregate({
        where: { commissionStatus: 'PENDING' },
        _sum: { agentCommission: true },
        _count: true,
      }),
      this.prisma.booking.groupBy({
        by: ['registryStatus'],
        _count: true,
        where: { registryStatus: { not: null } },
      }),
    ]);

    return {
      totalBookings,
      thisMonthBookings: thisMonth,
      totalRevenue: revenue._sum.totalAmount || 0,
      commissionPending: {
        amount: commissionPending._sum.agentCommission || 0,
        count: commissionPending._count,
      },
      registryPipeline: registryPipeline.map(r => ({ status: r.registryStatus, count: r._count })),
    };
  }

  async getBookingTimeline(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      select: { bookingTimeline: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return (booking as any).bookingTimeline || [];
  }

  async updateBookingStatus(id: string, data: { status?: string; registryStatus?: string }) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    const timelineEntry: any = { date: new Date().toISOString(), by: 'system' };
    if (data.status) {
      timelineEntry.stage = `Status → ${data.status}`;
      timelineEntry.notes = `Booking status changed to ${data.status}`;
    }
    if (data.registryStatus) {
      timelineEntry.stage = `Registry → ${data.registryStatus}`;
      timelineEntry.notes = `Registry status changed to ${data.registryStatus}`;
    }

    const currentTimeline = (booking as any).bookingTimeline || [];
    currentTimeline.push(timelineEntry);

    return this.prisma.booking.update({
      where: { id },
      data: { ...data, bookingTimeline: currentTimeline },
      include: this.include,
    });
  }

  async addDocument(id: string, doc: { type: string; url: string; title: string }) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    const docs = [...((booking as any).documents || [])];
    docs.push({ ...doc, uploadedAt: new Date().toISOString() });

    await this.prisma.booking.update({
      where: { id },
      data: { documents: docs },
    });
    return docs;
  }

  async removeDocument(id: string, index: number) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    const docs = [...((booking as any).documents || [])];
    if (index < 0 || index >= docs.length) throw new NotFoundException('Document not found');
    docs.splice(index, 1);

    await this.prisma.booking.update({
      where: { id },
      data: { documents: docs },
    });
    return docs;
  }

  async markCommissionPaid(id: string, data: { amount: number; notes?: string }) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    const timelineEntry = {
      stage: 'Commission Paid',
      date: new Date().toISOString(),
      notes: data.notes || `Commission of ₹${data.amount} paid`,
      by: 'system',
    };
    const currentTimeline = (booking as any).bookingTimeline || [];
    currentTimeline.push(timelineEntry);

    return this.prisma.booking.update({
      where: { id },
      data: {
        agentCommission: data.amount,
        commissionStatus: 'PAID',
        commissionPaidAt: new Date(),
        commissionNotes: data.notes,
        bookingTimeline: currentTimeline,
      },
      include: this.include,
    });
  }

  async generateBookingLetter(id: string) {
    const booking = await this.findOne(id);
    const dir = join(process.cwd(), 'uploads', 'letters');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const fileName = `${booking.bookingNumber}.pdf`;
    const filePath = join(dir, fileName);

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = createWriteStream(filePath);
      doc.pipe(stream);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('NIDHIVAN PROPERTY LINKERS', { align: 'center' });
      doc.fontSize(9).font('Helvetica').text('Building Dreams, One Property at a Time', { align: 'center' });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#C2512B');
      doc.moveDown(1);

      // Title
      doc.fontSize(14).font('Helvetica-Bold').text('BOOKING CONFIRMATION LETTER', { align: 'center' });
      doc.moveDown(1);

      // Booking info
      doc.fontSize(10).font('Helvetica');
      doc.text(`Booking Number: ${booking.bookingNumber}`, { continued: true }).text(`    Date: ${new Date(booking.createdAt).toLocaleDateString('en-IN')}`);
      doc.moveDown(0.5);

      // Customer details
      doc.fontSize(11).font('Helvetica-Bold').text('CUSTOMER DETAILS');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Name: ${booking.lead.name}`);
      doc.text(`Phone: ${booking.lead.phone}`);
      if (booking.lead.email) doc.text(`Email: ${booking.lead.email}`);
      doc.moveDown(0.5);

      // Property details
      doc.fontSize(11).font('Helvetica-Bold').text('PROPERTY DETAILS');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Project: ${booking.project.name}`);
      doc.text(`Location: ${booking.project.location}, ${booking.project.city}`);
      doc.text(`Unit: ${booking.unitNumber} (${booking.unitType})`);
      if (booking.unitArea) doc.text(`Area: ${booking.unitArea} sq ft`);
      doc.moveDown(0.5);

      // Payment details
      doc.fontSize(11).font('Helvetica-Bold').text('PAYMENT DETAILS');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Base Price: ₹${Number(booking.basePrice).toLocaleString('en-IN')}`);
      doc.text(`Booking Amount: ₹${Number(booking.bookingAmount).toLocaleString('en-IN')}`);
      doc.text(`Total Amount: ₹${Number(booking.totalAmount).toLocaleString('en-IN')}`);
      doc.moveDown(0.5);

      if (booking.paymentPlan) {
        doc.fontSize(11).font('Helvetica-Bold').text('PAYMENT PLAN');
        doc.fontSize(10).font('Helvetica');
        const plan = booking.paymentPlan;
        if (typeof plan === 'object') {
          Object.entries(plan).forEach(([key, val]) => {
            doc.text(`${key}: ${val}`);
          });
        } else {
          doc.text(String(plan));
        }
        doc.moveDown(0.5);
      }

      // Agent details
      if (booking.agent) {
        doc.fontSize(11).font('Helvetica-Bold').text('AGENT DETAILS');
        doc.fontSize(10).font('Helvetica');
        doc.text(`Agent: ${booking.agent.name}`);
        doc.text(`Contact: ${booking.agent.phone}`);
        doc.moveDown(0.5);
      }

      // Terms
      doc.fontSize(11).font('Helvetica-Bold').text('TERMS & CONDITIONS');
      doc.fontSize(9).font('Helvetica');
      doc.text('1. This booking is subject to verification of documents and payment clearance.', { lineGap: 2 });
      doc.text('2. The booking amount is non-refundable unless the project is cancelled by the company.', { lineGap: 2 });
      doc.text('3. Registration will be completed within 30 days of full payment.', { lineGap: 2 });
      doc.text('4. Stamp duty and registration charges are additional and payable by the buyer.', { lineGap: 2 });
      doc.moveDown(1.5);

      // Signatures
      const sigY = doc.y;
      doc.fontSize(10).font('Helvetica');
      doc.text('_________________________', 50, sigY);
      doc.text('Customer Signature', 50, sigY + 15);
      doc.text('_________________________', 350, sigY);
      doc.text('Authorized Signatory', 350, sigY + 15);

      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    const bookingLetterUrl = `/api/bookings/letters/${fileName}`;
    await this.prisma.booking.update({
      where: { id },
      data: { bookingLetterUrl },
    });
    return { url: bookingLetterUrl, bookingNumber: booking.bookingNumber };
  }
}
