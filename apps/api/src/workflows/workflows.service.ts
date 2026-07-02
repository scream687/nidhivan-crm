import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export type WorkflowTrigger = 'LEAD_CREATED' | 'STAGE_CHANGED' | 'MARKED_HOT' | 'TASK_DUE';

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async list() {
    return this.prisma.workflowRule.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(data: { name: string; trigger: WorkflowTrigger; triggerConfig?: any; actions: any[] }) {
    return this.prisma.workflowRule.create({ data });
  }

  async update(id: string, data: Partial<{ name: string; isActive: boolean; actions: any[]; triggerConfig: any }>) {
    return this.prisma.workflowRule.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.prisma.workflowRule.delete({ where: { id } });
    return { ok: true };
  }

  async fire(trigger: WorkflowTrigger, context: Record<string, any>) {
    const rules = await this.prisma.workflowRule.findMany({
      where: { trigger, isActive: true },
    });

    for (const rule of rules) {
      const cfg = rule.triggerConfig as any;
      // For STAGE_CHANGED, only fire if stage matches
      if (trigger === 'STAGE_CHANGED' && cfg?.stage && cfg.stage !== context.stage) continue;

      await this.executeActions(rule.actions as any[], context);
      await this.prisma.workflowRule.update({
        where: { id: rule.id },
        data: { runCount: { increment: 1 }, lastRunAt: new Date() },
      });
    }
  }

  private async executeActions(actions: any[], context: Record<string, any>) {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'SEND_NOTIFICATION': {
            if (context.assignedToId) {
              await this.notifications.create(
                context.assignedToId,
                action.config?.title ?? 'Workflow Alert',
                (action.config?.body ?? '').replace(/{{name}}/g, context.name ?? ''),
                'WORKFLOW',
                context.leadId,
                'Lead',
              );
            }
            break;
          }
          case 'CREATE_TASK': {
            if (context.assignedToId && context.leadId) {
              await this.prisma.task.create({
                data: {
                  title: (action.config?.title ?? 'Follow up').replace(/{{name}}/g, context.name ?? ''),
                  assignedToId: context.assignedToId,
                  leadId: context.leadId,
                  priority: action.config?.priority ?? 'MEDIUM',
                  dueDate: action.config?.dueDays
                    ? new Date(Date.now() + action.config.dueDays * 86_400_000)
                    : undefined,
                },
              });
            }
            break;
          }
          case 'CHANGE_STAGE': {
            if (context.leadId && action.config?.stage) {
              await this.prisma.lead.update({
                where: { id: context.leadId },
                data: { stage: action.config.stage },
              });
            }
            break;
          }
        }
      } catch (err) {
            this.logger.warn(`Action execute failed: ${err}`);
          }
    }
  }
}
