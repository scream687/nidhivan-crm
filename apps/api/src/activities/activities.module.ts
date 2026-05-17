import { Module } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { ActivitiesController, TasksController, GlobalActivitiesController } from './activities.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [ActivitiesService],
  controllers: [ActivitiesController, TasksController, GlobalActivitiesController],
})
export class ActivitiesModule {}

