import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class FollowUpService {
  constructor(
    @Inject('FOLLOWUP_QUEUE') private queue: Queue,
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async scheduleReminder(taskId: string, reminderAt: Date, type?: string, note?: string) {
    const delay = reminderAt.getTime() - Date.now();
    if (delay <= 0) return;
    await this.queue.add(
      `reminder-${taskId}`,
      { taskId, type, note },
      { delay, jobId: `reminder-${taskId}`, attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  async cancelReminder(taskId: string) {
    const job = await this.queue.getJob(`reminder-${taskId}`);
    if (job) await job.remove();
  }

  async handleReminder(taskId: string, type?: string, note?: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { lead: { select: { name: true } }, assignedTo: { select: { id: true } } },
    });
    if (!task || task.isCompleted || task.reminderSent) return;
    if (task.assignedToId) {
      await this.notifications.create(
        task.assignedTo.id,
        `Follow-up Reminder: ${task.title}`,
        note || `Follow-up ${type ? `(${type}) ` : ''}for ${task.lead?.name || 'lead'} is due.`,
        'followup_reminder',
        taskId,
        'Task',
      );
    }
    await this.prisma.task.update({
      where: { id: taskId },
      data: { reminderSent: true },
    });
  }

  async getPendingFollowUps(userId: string, date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);
    return this.prisma.task.findMany({
      where: {
        assignedToId: userId,
        isCompleted: false,
        dueDate: { gte: start, lte: end },
      },
      include: {
        lead: { select: { id: true, name: true, phone: true, stage: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getOverdueFollowUps(userId: string) {
    return this.prisma.task.findMany({
      where: {
        assignedToId: userId,
        isCompleted: false,
        dueDate: { lt: new Date() },
      },
      include: {
        lead: { select: { id: true, name: true, phone: true, stage: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getEscalations(level?: number) {
    const where: any = { escalationLevel: { gt: 0 } };
    if (level !== undefined) where.escalationLevel = level;
    return this.prisma.task.findMany({
      where,
      include: {
        lead: { select: { id: true, name: true, phone: true, stage: true, assignedToId: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { escalatedAt: 'desc' },
    });
  }

  async markReminderSent(taskId: string) {
    return this.prisma.task.update({
      where: { id: taskId },
      data: { reminderSent: true },
    });
  }

  async escalate(taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return null;
    return this.prisma.task.update({
      where: { id: taskId },
      data: { escalationLevel: { increment: 1 }, escalatedAt: new Date() },
    });
  }

  async markDone(taskId: string) {
    const existing = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!existing) throw new NotFoundException('Task not found');
    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: { isCompleted: true, completedAt: new Date() },
    });
    await this.cancelReminder(taskId);
    if (task.leadId) {
      await this.prisma.activity.create({
        data: {
          type: 'TASK',
          title: `Task completed: ${task.title}`,
          userId: task.assignedToId,
          leadId: task.leadId,
        },
      });
    }
    return task;
  }

  async autoGenerateFollowUps() {
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000);
    const leads = await this.prisma.lead.findMany({
      where: {
        assignedToId: { not: null },
        OR: [
          { lastContactedAt: null, createdAt: { lt: threeDaysAgo } },
          { lastContactedAt: { lt: threeDaysAgo } },
        ],
      },
      include: { assignedTo: { select: { id: true } } },
    });
    for (const lead of leads) {
      const existing = await this.prisma.task.findFirst({
        where: { leadId: lead.id, isCompleted: false },
      });
      if (existing) continue;
      await this.prisma.task.create({
        data: {
          title: `Follow-up: ${lead.name}`,
          priority: 'MEDIUM',
          assignedToId: lead.assignedToId!,
          leadId: lead.id,
          dueDate: new Date(Date.now() + 86_400_000),
          followupType: 'CALL',
        },
      });
    }
  }
}
