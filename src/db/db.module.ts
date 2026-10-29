import { ConfigService } from '@nestjs/config';
import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';

import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { EnvironmentVariables } from 'declarations';

import * as schema from './schema';

export const PG_POOL = 'PG_POOL';
export const DB = 'DB';

export type Database = NodePgDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvironmentVariables>) =>
        new Pool({
          host: configService.get('DATABASE_HOST'),
          port: Number(configService.get('DATABASE_PORT')),
          user: configService.get('DATABASE_USER'),
          password: configService.get('DATABASE_PASSWORD'),
          database: configService.get('DATABASE_NAME'),
        }),
    },
    {
      provide: DB,
      inject: [PG_POOL],
      useFactory: (pool: Pool): Database =>
        drizzle(pool, { schema, casing: 'snake_case' }),
    },
  ],
  exports: [DB, PG_POOL],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
