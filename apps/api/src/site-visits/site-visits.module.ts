import { Module } from '@nestjs/common';
import { SiteVisitsService } from './site-visits.service';
import { SiteVisitsController, LeadSiteVisitsController } from './site-visits.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [SiteVisitsService],
  controllers: [SiteVisitsController, LeadSiteVisitsController],
})
export class SiteVisitsModule {}
