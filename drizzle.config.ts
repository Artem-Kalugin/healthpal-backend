import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgres://test:test@localhost:5433/healthpal_test',
  },
});
