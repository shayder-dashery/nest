import { RedisOptions } from 'ioredis';

export function isQueueEnabled(): boolean {
  if (process.env.QUEUE_ENABLED === 'false') {
    return false;
  }

  if (process.env.REDIS_URL || process.env.REDIS_HOST) {
    return true;
  }

  return process.env.NODE_ENV !== 'production';
}

export function getRedisConnectionOptions(): RedisOptions {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    return {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
      password: process.env.REDIS_PASSWORD,
    };
  }

  const url = new URL(redisUrl);

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    tls: url.protocol === 'rediss:' ? {} : undefined,
  };
}
