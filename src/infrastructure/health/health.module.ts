import { RedisModule } from 'src/infrastructure/redis/redis.module';
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [RedisModule, TerminusModule, HttpModule],
  controllers: [HealthController],
})
export class HealthModule {}
