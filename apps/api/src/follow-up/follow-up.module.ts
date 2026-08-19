import { Module } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { FollowUpService } from './follow-up.service';
import { FollowUpController } from './follow-up.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [NotificationsModule, PrismaModule],
  controllers: [FollowUpController],
  providers: [
    FollowUpService,
    {
      provide: 'FOLLOWUP_QUEUE',
      useFactory: (config: ConfigService) => {
        // BullMQ cannot run without Redis, so with no REDIS_URL we hand back
        // null and FollowUpService skips scheduling. Defaulting to localhost
        // instead meant a deploy without Redis retried forever.
        const url = config.get<string>('REDIS_URL');
        if (!url) return null;
        const redis = new Redis(url, { maxRetriesPerRequest: null });
        return new Queue('followup-queue', { connection: redis });
      },
      inject: [ConfigService],
    },
    {
      provide: 'FOLLOWUP_WORKER',
      useFactory: (config: ConfigService, service: FollowUpService) => {
        const url = config.get<string>('REDIS_URL');
        if (!url) return null;
        const redis = new Redis(url, { maxRetriesPerRequest: null });
        const worker = new Worker(
          'followup-queue',
          async (job) => {
            await service.handleReminder(job.data.taskId, job.data.type, job.data.note);
          },
          { connection: redis, maxStalledCount: 3 },
        );
        worker.on('failed', (job, err) => {
          console.error(`[FollowUp] Job ${job?.id} failed: ${err.message}`);
        });
        worker.on('completed', (job) => {
          console.log(`[FollowUp] Job ${job.id} completed`);
        });
        return worker;
      },
      inject: [ConfigService, FollowUpService],
    },
  ],
  exports: [FollowUpService],
})
export class FollowUpModule {}
