import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit(): void {
    const redisUrl =
      this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
    this.redis.on('error', (err: Error) => {
      console.error('Redis connection error:', err);
    });
    this.redis.on('connect', () => {
      console.log('Redis connected');
    });
  }

  onModuleDestroy(): void {
    if (this.redis) {
      void this.redis.quit();
    }
  }

  async set(
    key: string,
    value: unknown,
    expirationInSeconds: number = 60,
  ): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', expirationInSeconds);
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async invalidateCache(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
