import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly enabled: boolean;

  constructor(
    @Optional() @Inject('REDIS_CLIENT') private readonly redis: Redis | null,
  ) {
    this.enabled = !!redis;
    if (!this.enabled) {
      this.logger.warn('Redis unavailable — caching disabled');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled) return null;
    try {
      const val = await this.redis!.get(key);
      return val ? (JSON.parse(val) as T) : null;
    } catch (e: any) {
      this.logger.warn(`cache.get(${key}) failed: ${e.message}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.redis!.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (e: any) {
      this.logger.warn(`cache.set(${key}) failed: ${e.message}`);
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.enabled || !keys.length) return;
    try {
      await this.redis!.del(...keys);
    } catch (e: unknown) {
      this.logger.warn(`cache.del(${keys.join(',')}) failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.enabled) return;
    try {
      const keys = await this.redis!.keys(pattern);
      if (keys.length) await this.redis!.del(...keys);
    } catch (e: unknown) {
      this.logger.warn(`cache.delPattern(${pattern}) failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
