import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Redis } from 'ioredis';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from 'src/app.module';
import { configureApp } from 'src/app.setup';
import { SessionService } from 'src/domain/auth/session.service';
import { user as userTable, type User } from 'src/db/schema';
import { eq } from 'drizzle-orm';
import { REDIS_PROVIDER_KEY } from 'src/infrastructure/redis/redis.module';
import { DB, type Database } from 'src/db/db.module';
import { clearDatabase, resetSchema } from '../integration/db';
import { createFactories } from '../integration/factories';

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let db: Database;
  let factories: ReturnType<typeof createFactories>;
  let sessionService: SessionService;

  beforeAll(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = testingModule.createNestApplication();
    configureApp(app);
    await app.init();

    db = app.get<Database>(DB);
    await resetSchema(db);
    factories = createFactories(db);
    sessionService = app.get(SessionService, { strict: false });
  });

  afterAll(async () => {
    // RedisModule does not close the connection itself, without this Jest does not exit
    await app.get<Redis>(REDIS_PROVIDER_KEY, { strict: false }).quit();
    await app.close();
  });

  beforeEach(async () => {
    await clearDatabase(db);
  });

  const tokenFor = async (user: User) => {
    const { accessToken } = await sessionService.generateTokens(user, 'e2e');

    return `Bearer ${accessToken}`;
  };

  const me = async (method: 'get' | 'patch', token: string, body?: object) => {
    let pending = request(app.getHttpServer())
      [method]('/users/me')
      .set('Authorization', token);
    if (body) pending = pending.field(body as Record<string, string>);
    const response = await pending;

    return {
      status: response.status,
      body: response.body as Record<string, any>,
    };
  };

  it('GET /users/me is available while registration is incomplete', async () => {
    const user = await factories.user({ registrationComplete: false });

    const { status, body } = await me('get', await tokenFor(user));

    expect(status).toBe(200);
    expect(body.id).toBe(user.id);
  });

  it('PATCH /users/me while registration is incomplete → 403', async () => {
    const user = await factories.user({ registrationComplete: false });

    const { status, body } = await me('patch', await tokenFor(user), {
      name: 'Пётр',
    });

    expect(status).toBe(403);
    expect(body).toEqual({ statusCode: 403, code: 'REGISTRATION_INCOMPLETE' });
  });

  it('PATCH /users/me updates the profile and does not return the password', async () => {
    const user = await factories.user({ registrationComplete: true });

    const { status, body } = await me('patch', await tokenFor(user), {
      name: 'пётр',
    });

    expect(status).toBe(200);
    expect(body.name).toBe('Пётр');
    expect(body).not.toHaveProperty('password');
  });

  it.each([
    {
      title: 'nonexistent date',
      birthday: '2026-13-45',
      code: 'DATE_FORMAT',
    },
    { title: '31 February', birthday: '2001-02-31', code: 'DATE_FORMAT' },
    {
      title: 'date in the future',
      birthday: '2999-01-01',
      code: 'DATE_IN_FUTURE',
    },
  ])(
    'PATCH /users/me: $title in birthday → 400',
    async ({ birthday, code }) => {
      const user = await factories.user({ registrationComplete: true });

      const { status, body } = await me('patch', await tokenFor(user), {
        birthday,
      });

      expect(status).toBe(400);
      expect(body.code).toBe('VALIDATION_FAILED');
      expect(body.validation as Record<string, unknown>).toHaveProperty(
        'birthday',
        expect.arrayContaining([{ code }]),
      );
    },
  );

  it('GET /users/me for a deleted user → 401', async () => {
    const user = await factories.user({ registrationComplete: true });
    const token = await tokenFor(user);
    await db.delete(userTable).where(eq(userTable.id, user.id));

    const { status, body } = await me('get', token);

    expect(status).toBe(401);
    expect(body).toEqual({ statusCode: 401, code: 'UNAUTHORIZED' });
  });

  it('PATCH /users/me with a taken nickname → 409 USER_NICKNAME_TAKEN', async () => {
    await factories.user({ nickname: 'taken' });
    const user = await factories.user({ registrationComplete: true });

    const { status, body } = await me('patch', await tokenFor(user), {
      nickname: 'taken',
    });

    expect(status).toBe(409);
    expect(body).toEqual({ statusCode: 409, code: 'USER_NICKNAME_TAKEN' });
  });
});
