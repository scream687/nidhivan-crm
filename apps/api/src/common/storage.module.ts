import { Global, Module } from '@nestjs/common';
import { R2Service } from './services/r2.service';

/**
 * Global so upload controllers can inject R2Service without each feature module
 * importing it — same pattern as RedisModule/CacheService.
 */
@Global()
@Module({
  providers: [R2Service],
  exports: [R2Service],
})
export class StorageModule {}
