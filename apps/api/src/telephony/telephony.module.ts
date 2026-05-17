import { Module } from '@nestjs/common';
import { TelephonyService } from './telephony.service';
import { TelephonyController } from './telephony.controller';

@Module({ providers: [TelephonyService], controllers: [TelephonyController] })
export class TelephonyModule {}
