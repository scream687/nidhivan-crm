import { Injectable, Inject, Optional, Logger, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const REMINDER_LEAD_MS = 15 * 60_000;
const STALE_AFTER_MS = 24 * 60 * 60_000;

@Injectable()
export class FollowUpService {
  private readonly logger = new Logger(FollowUpService.name);

  constructor(
    @Optional() @Inject('FOLLOWUP_QUEUE') private queue: Queue | null,
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async scheduleReminder(taskId: string, reminderAt: Date, type?: string, note?: string) {
    const delay = reminderAt.getTime() - Date.now();
    if (delay <= 0) return;
    if (!this.queue) {
      // No Redis configured — BullMQ is unavailable, so the reminder is not
      // scheduled. The task itself is still saved; only the timed nudge is lost.
      this.logger.warn(
        `Reminder for task ${taskId} not scheduled: no REDIS_URL configured`,
      );
      return;
    }
    await this.queue.add(
      `reminder-${taskId}`,
      { taskId, type, note },
      { delay, jobId: `reminder-${taskId}`, attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  async cancelReminder(taskId: string) {
    if (!this.queue) return;
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

  // Called by the cron tick (cron.controller.ts), not BullMQ: Render's free plan
  // sleeps and has no Redis, so timed jobs never fire there. A task with no
  // explicit reminderAt is nudged 15 min before it is due, matching the
  // "Lead Follow-up Reminder (15 min)" workflow the team ran in Cratio.
  async sweepDueReminders() {
    const now = new Date();
    // Anything that came due over a day ago is stale (e.g. imported from
    // Cratio); skipping it keeps one tick from sending thousands of nudges.
    const staleBefore = new Date(now.getTime() - STALE_AFTER_MS);
    const due = await this.prisma.task.findMany({
      where: {
        isCompleted: false,
        reminderSent: false,
        OR: [
          { reminderAt: { lte: now, gte: staleBefore } },
          {
            reminderAt: null,
            dueDate: { lte: new Date(now.getTime() + REMINDER_LEAD_MS), gte: staleBefore },
          },
        ],
      },
      select: {
        id: true,
        followupType: true,
        reminderNote: true,
        leadId: true,
        assignedToId: true,
        lead: { select: { name: true } },
      },
      take: 200,
    });
    for (const t of due) {
      await this.handleReminder(t.id, t.followupType ?? undefined, t.reminderNote ?? undefined);
    }
    return due;
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
