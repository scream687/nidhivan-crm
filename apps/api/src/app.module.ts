import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { envValidationSchema } from './config/env.validation';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LeadsModule } from './leads/leads.module';
import { ActivitiesModule } from './activities/activities.module';
import { TelephonyModule } from './telephony/telephony.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { SiteVisitsModule } from './site-visits/site-visits.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { InventoryModule } from './inventory/inventory.module';
import { BookingsModule } from './bookings/bookings.module';
import { StagesModule } from './stages/stages.module';
import { SavedFiltersModule } from './saved-filters/saved-filters.module';
import { MailModule } from './mail/mail.module';
import { MarketingModule } from './marketing/marketing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 120 }, // 120 req/min globally
    ]),
    RedisModule,
    HealthModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    LeadsModule,
    ActivitiesModule,
    TelephonyModule,
    NotificationsModule,
    ReportsModule,
    SiteVisitsModule,
    IntegrationsModule,
    WhatsAppModule,
    InventoryModule,
    BookingsModule,
    StagesModule,
    SavedFiltersModule,
    MailModule,
    MarketingModule,
  ],
  providers: [
    // Enforce throttling globally; individual routes can override with @Throttle / @SkipThrottle
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
