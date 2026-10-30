import { getTableName, is } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { PgTable } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';
import type { Database } from 'src/db/db.module';
import * as schema from 'src/db/schema';

export type TestDb = { db: Database; pool: Pool };

const TABLES = Object.values(schema).filter(value =>
  is(value, PgTable),
) as unknown as PgTable[];

/** Recreates the schema and applies migrations from `drizzle/`; e2e calls it on the app connection. */
export const resetSchema = async (db: Database) => {
  await db.execute('DROP SCHEMA IF EXISTS drizzle CASCADE');
  await db.execute('DROP SCHEMA IF EXISTS public CASCADE');
  await db.execute('CREATE SCHEMA public');
  await migrate(db, { migrationsFolder: 'drizzle' });
};

/**
 * Connection to the test DB that recreates the schema via migrations from `drizzle/`.
 * The reset is destructive, so we only work with a DB whose name ends with `_test`.
 */
export const createTestDb = async (): Promise<TestDb> => {
  const database = process.env.TEST_DATABASE_NAME ?? 'healthpal_test';

  if (!database.endsWith('_test')) {
    throw new Error(
      `Integration tests reset the schema, the DB name must end with "_test", got "${database}"`,
    );
  }

  const pool = new Pool({
    host: process.env.TEST_DATABASE_HOST ?? 'localhost',
    port: Number(process.env.TEST_DATABASE_PORT ?? 5433),
    user: process.env.TEST_DATABASE_USER ?? 'test',
    password: process.env.TEST_DATABASE_PASSWORD ?? 'test',
    database,
  });
  const db = drizzle(pool, { casing: 'snake_case' });

  await resetSchema(db);

  return { db, pool };
};

export const clearDatabase = async (db: Database) => {
  const tables = TABLES.map(table => `"${getTableName(table)}"`).join(', ');

  await db.execute(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
};
