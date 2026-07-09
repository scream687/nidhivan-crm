import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessMetricsService } from '../metrics/business-metrics.service';
import { FollowUpService } from '../follow-up/follow-up.service';
import { Priority } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private followUp: FollowUpService,
    private metrics: BusinessMetricsService,
  ) {}

  async create(data: {
    title: string;
    description?: string;
    dueDate?: string;
    priority?: Priority;
    assignedToId: string;
    leadId?: string;
    reminderAt?: string;
    reminderNote?: string;
    followupType?: string;
  }) {
    const task = await this.prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        priority: data.priority || 'MEDIUM',
        assignedToId: data.assignedToId,
        leadId: data.leadId,
        reminderNote: data.reminderNote,
        followupType: data.followupType,
        reminderAt: data.reminderAt ? new Date(data.reminderAt) : undefined,
      },
      include: { lead: { select: { id: true, name: true } }, assignedTo: { select: { id: true, name: true } } },
    });
    if (task.reminderAt) {
      await this.followUp.scheduleReminder(task.id, task.reminderAt, data.followupType, data.reminderNote);
    }
    return task;
  }

  async findAll(filters: {
    assignedToId?: string;
    isCompleted?: boolean;
    leadId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 200);
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.isCompleted !== undefined) where.isCompleted = filters.isCompleted;
    if (filters.leadId) where.leadId = filters.leadId;
    if (filters.dateFrom || filters.dateTo) {
      where.dueDate = {
        ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
        ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
      };
    }
    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'asc' },
        include: { lead: { select: { id: true, name: true, phone: true } }, assignedTo: { select: { id: true, name: true } } },
      }),
      this.prisma.task.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async complete(id: string) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');
    const task = await this.prisma.task.update({
      where: { id },
      data: { isCompleted: true, completedAt: new Date() },
    });
    this.metrics.onTaskChanged().catch((e) => console.error('task metrics', e));
    return task;
  }

  async update(id: string, data: any) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');
    const task = await this.prisma.task.update({
      where: { id },
      data: {
        ...data,
        ...(data.dueDate ? { dueDate: new Date(data.dueDate) } : {}),
        ...(data.reminderAt ? { reminderAt: new Date(data.reminderAt) } : {}),
      },
      include: { lead: { select: { id: true, name: true } }, assignedTo: { select: { id: true, name: true } } },
    });
    if (data.reminderAt && task.reminderAt) {
      await this.followUp.cancelReminder(id);
      await this.followUp.scheduleReminder(id, task.reminderAt, data.followupType, data.reminderNote);
    }
    return task;
  }

  async delete(id: string) {
    await this.followUp.cancelReminder(id);
    await this.prisma.task.delete({ where: { id } });
    return { ok: true };
  }
}
