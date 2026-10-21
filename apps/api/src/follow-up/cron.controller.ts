import { Controller, Headers, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { FollowUpService } from './follow-up.service';
import { WorkflowsService } from '../workflows/workflows.service';

// Hit every 5 min by an external scheduler (see render.yaml, CRON_SECRET).
// Render's free plan sleeps and runs no Redis, so this replaces timers inside
// the process. The ping also keeps the instance awake during working hours.
@Controller('cron')
export class CronController {
  constructor(
    private config: ConfigService,
    private followUp: FollowUpService,
    private workflows: WorkflowsService,
  ) {}

  @Post('tick')
  @HttpCode(200)
  async tick(@Headers('x-cron-secret') secret?: string) {
    const expected = this.config.get<string>('CRON_SECRET');
    if (!expected || !secret || !safeEqual(secret, expected)) {
      throw new UnauthorizedException();
    }

    const reminded = await this.followUp.sweepDueReminders();
    for (const t of reminded) {
      await this.workflows
        .fire('TASK_DUE', { leadId: t.leadId, name: t.lead?.name, assignedToId: t.assignedToId })
        .catch((e) => console.error('TASK_DUE workflow', e));
    }

    // autoGenerateFollowUps() is deliberately not called here: after the Cratio
    // import it would open a task for every lead untouched for 3 days (tens of
    // thousands) and flood the team with reminders the next day.
    return { reminded: reminded.length };
  }
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
