import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Redis } from 'ioredis';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from 'src/app.module';
import { configureApp } from 'src/app.setup';
import { REDIS_PROVIDER_KEY } from 'src/infrastructure/redis/redis.module';
import { DB, type Database } from 'src/db/db.module';
import { clearDatabase, resetSchema } from '../integration/db';
import { freezeDate } from '../integration/time';

const PASSWORD = 'Password1';
const PHONE = '+79001234567';

interface AuthBody {
  accessToken: string;
  refreshToken: string;
  user: { id: string; phone: string };
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let db: Database;
  let redis: Redis;

  beforeAll(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = testingModule.createNestApplication();
    configureApp(app);
    await app.init();

    db = app.get<Database>(DB);
    await resetSchema(db);
    redis = app.get<Redis>(REDIS_PROVIDER_KEY, { strict: false });
  });

  afterAll(async () => {
    // RedisModule сам соединение не закрывает, без этого Jest не завершается
    await redis.quit();
    await app.close();
  });

  beforeEach(async () => {
    jest.useRealTimers();
    await clearDatabase(db);
    await redis.flushdb();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const post = (path: string, body: object) =>
    request(app.getHttpServer()).post(path).send(body);

  it('register → login → refresh: токены рабочие, пароль не отдаётся', async () => {
    freezeDate(new Date('2026-10-29T12:00:00Z'));
    const registered = await post('/auth/register', {
      phone: PHONE,
      password: PASSWORD,
      name: 'Иван',
      surname: 'Иванов',
    });
    const loggedIn = await post('/auth/login', {
      phone: PHONE,
      password: PASSWORD,
    });
    freezeDate(new Date('2026-10-29T12:00:10Z'));
    const loggedInBody = loggedIn.body as AuthBody;
    const refreshed = await post('/auth/refresh', {
      userId: loggedInBody.user.id,
      refreshToken: loggedInBody.refreshToken,
    });
    const refreshedBody = refreshed.body as AuthBody;
    const me = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${refreshedBody.accessToken}`);

    expect([registered.status, loggedIn.status, refreshed.status]).toEqual([
      201, 201, 201,
    ]);
    expect(loggedInBody.user).not.toHaveProperty('password');
    expect(refreshedBody.user).not.toHaveProperty('password');
    expect(me.status).toBe(200);
    expect((me.body as { id: string }).id).toBe(loggedInBody.user.id);
  });

  describe('ошибки валидации', () => {
    it('регистрация со слабым паролем: все нарушенные правила с params', async () => {
      const response = await post('/auth/register', {
        phone: PHONE,
        password: 'abc',
        name: 'Иван',
        surname: 'Иванов',
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        statusCode: 400,
        code: 'VALIDATION_FAILED',
        validation: {
          password: [
            { code: 'PASSWORD_TOO_SHORT', params: { limit: 8 } },
            { code: 'PASSWORD_WEAK' },
          ],
        },
      });
    });

    it('логин: политика пароля не проверяется, лишнее поле даёт UNKNOWN_FIELD', async () => {
      const response = await post('/auth/login', {
        phone: 'bad',
        password: 'abc',
        extra: 1,
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        statusCode: 400,
        code: 'VALIDATION_FAILED',
        validation: {
          phone: [{ code: 'PHONE_FORMAT' }],
          extra: [{ code: 'UNKNOWN_FIELD' }],
        },
      });
    });
  });
});
