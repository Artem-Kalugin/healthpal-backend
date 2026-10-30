/* eslint-disable @typescript-eslint/naming-convention */

// Must run before AppModule is imported: it reads DATABASE_* from process.env on load.
const database = process.env.TEST_DATABASE_NAME ?? 'healthpal_test';

if (!database.endsWith('_test')) {
  throw new Error(
    `e2e tests wipe data, the DB name must end with "_test", got "${database}"`,
  );
}

Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_HOST: process.env.TEST_DATABASE_HOST ?? 'localhost',
  DATABASE_PORT: process.env.TEST_DATABASE_PORT ?? '5433',
  DATABASE_USER: process.env.TEST_DATABASE_USER ?? 'test',
  DATABASE_PASSWORD: process.env.TEST_DATABASE_PASSWORD ?? 'test',
  DATABASE_NAME: database,
  REDIS_HOST: process.env.TEST_REDIS_HOST ?? 'localhost',
  REDIS_PORT: process.env.TEST_REDIS_PORT ?? '6380',
  REDIS_PASSWORD: '',
  REDIS_DB: '0',
  JWT_SECRET: 'e2e-secret-at-least-32-characters-long',
  JWT_REFRESH_SECRET: 'e2e-refresh-secret-at-least-32-chars',
  JWT_EXPIRES_IN: '1h',
  JWT_REFRESH_TTL: '3600',
  OTP_TTL: '600',
  RECOVERY_TTL: '3600',
  OTP_HMAC_SECRET: 'e2e-otp-secret-16+',
});
