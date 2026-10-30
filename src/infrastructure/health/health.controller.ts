import { Controller, Get, Inject } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { sql } from 'drizzle-orm';
import { ApiExcludeController } from '@nestjs/swagger';
import { REDIS_PROVIDER_KEY } from 'src/infrastructure/redis/redis.module';
import { Redis } from 'ioredis';
import { DB } from 'src/db/db.module';
import type { Database } from 'src/db/db.module';
import { Public } from 'src/common/helpers/decorators/public.decorator';
import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';

@ApiExcludeController()
@Controller('health')
@Public()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    @Inject(DB) private readonly db: Database,
    private readonly memory: MemoryHealthIndicator,
    @Inject(REDIS_PROVIDER_KEY)
    private readonly redisClient: Redis,
  ) {}

  @Get()
  @HealthCheck()
  async check() {
    const redisCheck = async (): Promise<HealthIndicatorResult> => {
      await this.redisClient.ping();
      return { redis: { status: 'up' } };
    };

    try {
      await this.health.check([
        async (): Promise<HealthIndicatorResult> => {
          await this.db.execute(sql`select 1`);
          return { database: { status: 'up' } };
        },
        async () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
        async () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024),
        redisCheck,
      ]);

      return {
        status: 'ok',
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new AppException(ErrorCode.SERVICE_UNAVAILABLE, {
        message: error instanceof Error ? error.message : String(error),
        cause: error,
      });
    }
  }

  @Get('detailed')
  async checkDetailed() {
    const used = process.memoryUsage();
    const format = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

    let databaseStatus = '';
    try {
      await this.db.execute(sql`select 1`);
      databaseStatus = 'connected';
    } catch {
      databaseStatus = 'disconnected';
    }

    let redisStatus = '';
    try {
      await this.redisClient.ping();
      redisStatus = 'connected';
    } catch {
      redisStatus = 'disconnected';
    }

    return {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      memory: {
        rss: format(used.rss),
        heapTotal: format(used.heapTotal),
        heapUsed: format(used.heapUsed),
        external: format(used.external),
      },
      database: databaseStatus,
      redis: redisStatus,
    };
  }
}
