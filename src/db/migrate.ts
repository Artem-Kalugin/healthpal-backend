import { resolve } from 'node:path';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

/** Применяет миграции из `drizzle/` отдельным шагом перед стартом приложения. */
const run = async () => {
  const pool = new Pool({
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 5432),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME ?? 'healthpal',
  });

  try {
    await migrate(drizzle(pool, { casing: 'snake_case' }), {
      migrationsFolder: resolve(__dirname, '../../drizzle'),
    });
  } finally {
    await pool.end();
  }
};

run().catch(error => {
  console.error('Миграции не применены:', error);
  process.exit(1);
});
