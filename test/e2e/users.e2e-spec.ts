import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Redis } from 'ioredis';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { App } from 'supertest/types';
import { AppModule } from 'src/app.module';
import { configureApp } from 'src/app.setup';
import { AuthService } from 'src/domain/auth/auth.service';
import { User } from 'src/entities/user.entity';
import { REDIS_PROVIDER_KEY } from 'src/infrastructure/redis/redis.module';
import { clearDatabase } from '../integration/db';
import { createFactories } from '../integration/factories';

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let factories: ReturnType<typeof createFactories>;
  let authService: AuthService;

  beforeAll(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = testingModule.createNestApplication();
    configureApp(app);
    await app.init();

    dataSource = app.get(DataSource);
    factories = createFactories(dataSource);
    authService = app.get(AuthService, { strict: false });
  });

  afterAll(async () => {
    // RedisModule сам соединение не закрывает, без этого Jest не завершается
    await app.get<Redis>(REDIS_PROVIDER_KEY, { strict: false }).quit();
    await app.close();
  });

  beforeEach(async () => {
    await clearDatabase(dataSource);
  });

  const tokenFor = async (user: User) => {
    const { accessToken } = await authService.generateTokens(user, 'e2e');

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

  it('GET /users/me доступен при незавершённой регистрации', async () => {
    const user = await factories.user({ registrationComplete: false });

    const { status, body } = await me('get', await tokenFor(user));

    expect(status).toBe(200);
    expect(body.id).toBe(user.id);
  });

  it('PATCH /users/me при незавершённой регистрации → 403', async () => {
    const user = await factories.user({ registrationComplete: false });

    const { status } = await me('patch', await tokenFor(user), {
      name: 'Пётр',
    });

    expect(status).toBe(403);
  });

  it('PATCH /users/me обновляет профиль и не отдаёт пароль', async () => {
    const user = await factories.user({ registrationComplete: true });

    const { status, body } = await me('patch', await tokenFor(user), {
      name: 'пётр',
    });

    expect(status).toBe(200);
    expect(body.name).toBe('Пётр');
    expect(body).not.toHaveProperty('password');
  });

  it('GET /users/me для удалённого пользователя → 401', async () => {
    const user = await factories.user({ registrationComplete: true });
    const token = await tokenFor(user);
    await dataSource.getRepository(User).delete(user.id);

    const { status } = await me('get', token);

    expect(status).toBe(401);
  });
});
