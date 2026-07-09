import { Global, Module } from '@nestjs/common';
import { BusinessMetricsService } from './business-metrics.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Global()
@Module({
  imports: [NotificationsModule],
  providers: [BusinessMetricsService],
  exports: [BusinessMetricsService],
})
export class BusinessMetricsModule {}
