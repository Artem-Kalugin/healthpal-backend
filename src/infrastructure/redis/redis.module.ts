import { ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';

import { Redis } from 'ioredis';
import { EnvironmentVariables } from 'declarations';

export const REDIS_PROVIDER_KEY = 'REDIS_CLIENT';

@Module({
  providers: [
    {
      provide: REDIS_PROVIDER_KEY,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvironmentVariables>) => {
        return new Redis({
          host: configService.get('REDIS_HOST'),
          port: Number(configService.get('REDIS_PORT')),
          password: configService.get('REDIS_PASSWORD') || undefined,
          db: Number(configService.get('REDIS_DB')) || 0,
        });
      },
    },
  ],
  exports: [REDIS_PROVIDER_KEY],
})
export class RedisModule {}
