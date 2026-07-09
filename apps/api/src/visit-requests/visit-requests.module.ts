import { Module } from '@nestjs/common';
import { VisitRequestsController } from './visit-requests.controller';
import { VisitRequestsService } from './visit-requests.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VisitRequestsController],
  providers: [VisitRequestsService],
})
export class VisitRequestsModule {}
