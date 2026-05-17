import { Module, forwardRef } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { MarketingModule } from '../marketing/marketing.module';
import { WorkflowsModule } from '../workflows/workflows.module';

@Module({
  imports: [NotificationsModule, forwardRef(() => MarketingModule), forwardRef(() => WorkflowsModule)],
  providers: [LeadsService],
  controllers: [LeadsController],
  exports: [LeadsService],
})
export class LeadsModule {}

