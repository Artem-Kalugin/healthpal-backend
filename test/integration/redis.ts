// eslint-disable-next-line @typescript-eslint/naming-convention
import Redis from 'ioredis';

/**
 * Подключение к тестовому Redis из docker-compose.test.yml.
 * `flushdb` разрушителен, поэтому отказываемся работать с портом, отличным от тестового.
 */
export const createTestRedis = () => {
  const port = Number(process.env.TEST_REDIS_PORT ?? 6380);

  if (port !== 6380) {
    throw new Error(
      `Интеграционные тесты очищают Redis, ожидается тестовый порт 6380, получен ${port}`,
    );
  }

  return new Redis({
    host: process.env.TEST_REDIS_HOST ?? 'localhost',
    port,
    db: 0,
  });
};
