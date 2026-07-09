import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { FollowUpModule } from '../follow-up/follow-up.module';

@Module({
  imports: [FollowUpModule],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
