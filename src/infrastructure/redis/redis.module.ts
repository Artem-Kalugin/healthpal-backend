import { Module } from '@nestjs/common';

import { Redis } from 'ioredis';

export const REDIS_PROVIDER_KEY = 'REDIS_CLIENT';

@Module({
  providers: [
    {
      provide: REDIS_PROVIDER_KEY,
      useFactory: () => {
        return new Redis({
          host: process.env.REDIS_HOST,
          port: Number(process.env.REDIS_PORT),
          password: process.env.REDIS_PASSWORD || undefined,
          db: Number(process.env.REDIS_DB) || 0,
        });
      },
    },
  ],
  exports: [REDIS_PROVIDER_KEY],
})
export class RedisModule {}
