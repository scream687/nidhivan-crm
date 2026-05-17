import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityType, Priority, Role } from '@prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';

const MANAGER_ROLES: Role[] = [Role.ADMIN, Role.MANAGER];

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService, private gateway: NotificationsGateway) {}

  async getTimeline(leadId: string) {
    const [activities, calls, tasks] = await Promise.all([
      this.prisma.activity.findMany({
        where: { leadId },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.callLog.findMany({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.task.findMany({
        where: { leadId },
        include: { assignedTo: { select: { id: true, name: true } } },
        orderBy: { dueDate: 'asc' },
      }),
    ]);

    return { activities, calls, tasks };
  }

  async addNote(leadId: string, content: string, userId: string) {
    const activity = await this.prisma.activity.create({
      data: { type: ActivityType.NOTE, title: 'Note added', description: content, userId, leadId },
      include: { user: { select: { id: true, name: true, avatarUrl: true } }, lead: { select: { name: true, assignedToId: true } } },
    });
    this.gateway.emitToAdmin('activity:new', activity);
    if (activity.lead?.assignedToId) {
      this.gateway.emitToUser(activity.lead.assignedToId, 'activity:new', activity);
    }
    return activity;
  }

  async createTask(leadId: string, data: { title: string; dueDate?: string; priority?: Priority; assignedToId: string }, userId: string) {
    const task = await this.prisma.task.create({
      data: { title: data.title, dueDate: data.dueDate ? new Date(data.dueDate) : undefined, priority: data.priority || Priority.MEDIUM, assignedToId: data.assignedToId, leadId },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    const activity = await this.prisma.activity.create({
      data: { type: ActivityType.TASK, title: `Task created: ${data.title}`, metadata: { taskId: task.id }, userId, leadId },
      include: { user: { select: { id: true, name: true, avatarUrl: true } }, lead: { select: { name: true, assignedToId: true } } },
    });
    this.gateway.emitToAdmin('activity:new', activity);
    if (activity.lead?.assignedToId) {
      this.gateway.emitToUser(activity.lead.assignedToId, 'activity:new', activity);
    }

    return task;
  }

  async completeTask(taskId: string, userId: string) {
    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: { isCompleted: true, completedAt: new Date() },
    });

    if (task.leadId) {
      const activity = await this.prisma.activity.create({
        data: { type: ActivityType.TASK, title: `Task completed: ${task.title}`, metadata: { taskId }, userId, leadId: task.leadId },
        include: { user: { select: { id: true, name: true, avatarUrl: true } }, lead: { select: { name: true, assignedToId: true } } },
      });
      this.gateway.emitToAdmin('activity:new', activity);
      if (activity.lead?.assignedToId) {
        this.gateway.emitToUser(activity.lead.assignedToId, 'activity:new', activity);
      }
    }

    return task;
  }

  async getAllTasks(user: any, isCompleted?: boolean) {
    const isManager = MANAGER_ROLES.includes(user.role as Role);

    const where: any = {};
    if (!isManager) {
      where.assignedToId = user.id;
    }
    if (isCompleted !== undefined) {
      where.isCompleted = isCompleted;
    }

    const data = await this.prisma.task.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true, leadNumber: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    return { data, total: data.length };
  }

  async completeTaskById(taskId: string, userId: string) {
    return this.completeTask(taskId, userId);
  }

  async createStandaloneTask(data: { title: string; description?: string; dueDate?: string; priority?: Priority; assignedToId: string; leadId?: string }) {
    return this.prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        priority: data.priority || Priority.MEDIUM,
        assignedToId: data.assignedToId,
        leadId: data.leadId || null,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true, leadNumber: true } },
      },
    });
  }

  async getAllActivities(user: any, filters: { type?: string; leadId?: string; limit?: number }) {
    const isManager = MANAGER_ROLES.includes(user.role as Role);

    const where: any = {};
    if (!isManager) {
      where.userId = user.id;
    }
    if (filters.type) {
      where.type = filters.type as ActivityType;
    }
    if (filters.leadId) {
      where.leadId = filters.leadId;
    }

    return this.prisma.activity.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        lead: { select: { id: true, name: true, leadNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit ?? 50,
    });
  }
}
