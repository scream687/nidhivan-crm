import { Module, forwardRef } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { MarketingModule } from '../marketing/marketing.module';

@Module({
  imports: [NotificationsModule, forwardRef(() => MarketingModule)],
  providers: [LeadsService],
  controllers: [LeadsController],
  exports: [LeadsService],
})
export class LeadsModule {}

