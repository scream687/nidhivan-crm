import { Module } from '@nestjs/common';
import { TelephonyService } from './telephony.service';
import { TelephonyController } from './telephony.controller';
import { LeadsModule } from '../leads/leads.module';

// LeadsModule so an inbound IVR call creates its lead through the same path as
// every other source — round-robin assignment, activity log and notification
// included, rather than an unassigned row nobody is told about.
@Module({
  imports: [LeadsModule],
  providers: [TelephonyService],
  controllers: [TelephonyController],
})
export class TelephonyModule {}
