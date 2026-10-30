import { ConfigService } from '@nestjs/config';
import {
  Global,
  Inject,
  Logger,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';

import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { EnvironmentVariables } from 'declarations';

const PG_POOL = 'PG_POOL';
export const DB = 'DB';

export type Database = NodePgDatabase;

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvironmentVariables>) => {
        const pool = new Pool({
          host: configService.get('DATABASE_HOST'),
          port: Number(configService.get('DATABASE_PORT')),
          user: configService.get('DATABASE_USER'),
          password: configService.get('DATABASE_PASSWORD'),
          database: configService.get('DATABASE_NAME'),
        });
        // Без слушателя обрыв простаивающего соединения роняет процесс
        pool.on('error', error =>
          new Logger('DbModule').error(
            `Idle pg client error: ${error.message}`,
            error.stack,
          ),
        );
        return pool;
      },
    },
    {
      provide: DB,
      inject: [PG_POOL],
      useFactory: (pool: Pool): Database =>
        drizzle(pool, { casing: 'snake_case' }),
    },
  ],
  exports: [DB],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
