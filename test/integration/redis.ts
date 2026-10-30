// eslint-disable-next-line @typescript-eslint/naming-convention
import Redis from 'ioredis';

/**
 * Connection to the test Redis from docker-compose.test.yml.
 * `flushdb` is destructive, so we refuse to work with a port other than the test one.
 */
export const createTestRedis = () => {
  const port = Number(process.env.TEST_REDIS_PORT ?? 6380);

  if (port !== 6380) {
    throw new Error(
      `Integration tests flush Redis, the test port 6380 is expected, got ${port}`,
    );
  }

  return new Redis({
    host: process.env.TEST_REDIS_HOST ?? 'localhost',
    port,
    db: 0,
  });
};
