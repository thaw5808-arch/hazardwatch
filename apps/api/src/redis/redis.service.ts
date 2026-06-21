import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: RedisClientType;
  private subscriber!: RedisClientType;

  async onModuleInit() {
    this.client = createClient({ url: process.env.REDIS_URL }) as RedisClientType;
    this.subscriber = this.client.duplicate() as RedisClientType;
    this.client.on('error', (err) => this.logger.error('Redis client error', err));
    this.subscriber.on('error', (err) => this.logger.error('Redis subscriber error', err));
    await Promise.all([this.client.connect(), this.subscriber.connect()]);
    this.logger.log('Redis connected');
  }

  async onModuleDestroy() {
    await Promise.all([this.client.quit(), this.subscriber.quit()]);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async setex(key: string, ttl: number, value: string): Promise<void> {
    await this.client.setEx(key, ttl, value);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message);
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    await this.subscriber.subscribe(channel, callback);
  }
}
