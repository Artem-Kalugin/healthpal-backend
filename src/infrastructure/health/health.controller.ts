import {
  Controller,
  Get,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { ApiExcludeController } from '@nestjs/swagger';
import { REDIS_PROVIDER_KEY } from '../redis/redis.module';
import { Redis } from 'ioredis';
import { Public } from 'src/common/helpers/decorators/public.decorator';

@ApiExcludeController()
@Controller('health')
@Public()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
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
        async () => this.database.pingCheck('database'),
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
      throw new HttpException(
        {
          status: 'error',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          message: error.message,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Get('detailed')
  async checkDetailed() {
    const used = process.memoryUsage();
    const format = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

    let databaseStatus = '';
    try {
      await this.database.pingCheck('database');
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
