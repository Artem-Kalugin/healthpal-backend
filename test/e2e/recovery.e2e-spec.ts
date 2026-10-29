import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Redis } from 'ioredis';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { App } from 'supertest/types';
import { AppModule } from 'src/app.module';
import { configureApp } from 'src/app.setup';
import { REDIS_PROVIDER_KEY } from 'src/infrastructure/redis/redis.module';
import { PasswordService } from 'src/infrastructure/password/password.service';
import { clearDatabase } from '../integration/db';
import { createFactories } from '../integration/factories';

/* eslint-disable sonarjs/no-hardcoded-passwords */
const OLD_PASSWORD = 'OldPassword1';
const NEW_PASSWORD = 'NewPassword1';
/* eslint-enable sonarjs/no-hardcoded-passwords */

describe('Recovery (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let factories: ReturnType<typeof createFactories>;
  let redis: Redis;
  let phone: string;

  beforeAll(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = testingModule.createNestApplication();
    configureApp(app);
    await app.init();

    dataSource = app.get(DataSource);
    factories = createFactories(dataSource);
    redis = app.get<Redis>(REDIS_PROVIDER_KEY, { strict: false });
  });

  afterAll(async () => {
    // RedisModule сам соединение не закрывает, без этого Jest не завершается
    await redis.quit();
    await app.close();
  });

  beforeEach(async () => {
    await clearDatabase(dataSource);
    await redis.flushdb();
    const password = await app
      .get(PasswordService, { strict: false })
      .hash(OLD_PASSWORD);
    ({ phone } = await factories.user({ password }));
  });

  const post = (path: string, body: object) =>
    request(app.getHttpServer()).post(path).send(body);

  const login = (password: string) => post('/auth/login', { phone, password });

  const obtainRecoveryToken = async () => {
    const requested = await post('/auth/recovery/otp/request', { phone });
    const verified = await post('/auth/recovery/otp/verify', {
      phone,
      otp: (requested.body as { smsDemoOnly: string }).smsDemoOnly,
    });

    return (verified.body as { recoveryToken: string }).recoveryToken;
  };

  it('восстановление: код → токен → новый пароль; вход работает только с новым паролем', async () => {
    const token = await obtainRecoveryToken();

    const reset = await post('/auth/recovery/reset-password', {
      token,
      password: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });

    expect(reset.status).toBe(201);
    expect(reset.body).toHaveProperty('accessToken');
    expect((await login(NEW_PASSWORD)).status).toBe(201);
    expect((await login(OLD_PASSWORD)).status).toBe(401);
  });

  it('пароли не совпадают → 401, пароль не меняется, токен остаётся валидным', async () => {
    const token = await obtainRecoveryToken();

    const reset = await post('/auth/recovery/reset-password', {
      token,
      password: NEW_PASSWORD,
      // eslint-disable-next-line sonarjs/no-hardcoded-passwords
      confirmPassword: 'Different123',
    });

    expect(reset.status).toBe(401);
    expect((await login(OLD_PASSWORD)).status).toBe(201);
    expect(await redis.get(`recovery:${token}`)).toBe(phone);
  });
});
