import { RedisModule } from 'src/infrastructure/redis/redis.module';
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { TerminusModule } from '@nestjs/terminus';

@Module({
  imports: [RedisModule, TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}
