import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Redis } from 'ioredis';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from 'src/app.module';
import { configureApp } from 'src/app.setup';
import { AuthService } from 'src/domain/auth/auth.service';
import { REDIS_PROVIDER_KEY } from 'src/infrastructure/redis/redis.module';
import { userFavoriteMedicalCenter } from 'src/db/schema';
import { DB, type Database } from 'src/db/db.module';
import { clearDatabase, resetSchema } from '../integration/db';
import { createFactories } from '../integration/factories';

type Body = Record<string, any>;

describe('Medical centers (e2e)', () => {
  let app: INestApplication<App>;
  let db: Database;
  let factories: ReturnType<typeof createFactories>;
  let authService: AuthService;

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
    authService = app.get(AuthService, { strict: false });
  });

  afterAll(async () => {
    // RedisModule сам соединение не закрывает, без этого Jest не завершается
    await app.get<Redis>(REDIS_PROVIDER_KEY, { strict: false }).quit();
    await app.close();
  });

  beforeEach(async () => {
    await clearDatabase(db);
  });

  const send = async (url: string, query?: object, token?: string) => {
    let pending = request(app.getHttpServer()).get(url);
    if (token) pending = pending.set('Authorization', token);
    if (query) pending = pending.query(query);
    const response = await pending;

    return { status: response.status, body: response.body as Body };
  };

  const newUser = async () => {
    const user = await factories.user({ registrationComplete: true });
    const { accessToken } = await authService.generateTokens(user, 'e2e');

    return { user, token: `Bearer ${accessToken}` };
  };

  /** Центры на экваторе: i-й в 0.01·i градуса долготы от точки (0, 0). */
  const seedCenters = async (count: number) => {
    const centers: { id: string }[] = [];
    for (let index = 1; index <= count; index++) {
      centers.push(await factories.medicalCenter({ lat: 0, lon: index / 100 }));
    }

    return centers;
  };

  it('без токена оба эндпоинта отвечают 401', async () => {
    for (const url of ['/medical-centers', '/medical-centers/favorites']) {
      const { status } = await send(url, { shouldTake5Only: false });
      expect(status).toBe(401);
    }
  });

  describe('GET /medical-centers', () => {
    it('без lat/lon отдаёт центры по рейтингу без расстояния; shouldTake5Only приходит строкой и честно разбирается', async () => {
      const { token } = await newUser();
      await seedCenters(6);

      const top5 = await send(
        '/medical-centers',
        { shouldTake5Only: 'true' },
        token,
      );
      const all = await send(
        '/medical-centers',
        { shouldTake5Only: 'false' },
        token,
      );

      expect(top5.status).toBe(200);
      expect(top5.body).toHaveLength(5);
      expect(top5.body[0]).not.toHaveProperty('distance');
      expect(all.body).toHaveLength(6);
    });

    it('с lat и lon отдаёт центры по расстоянию с distance и walkingTimeMinutes', async () => {
      const { token } = await newUser();
      const centers = await seedCenters(3);

      const { status, body } = await send(
        '/medical-centers',
        { shouldTake5Only: false, lat: '0', lon: '0' },
        token,
      );

      expect(status).toBe(200);
      expect(
        (body as unknown as Body[]).map(item => item.id as string),
      ).toEqual(centers.map(item => item.id));
      expect(body[0]).toMatchObject({ distance: 1.1, walkingTimeMinutes: 13 });
    });

    it('нечисловой lat → 400', async () => {
      const { token } = await newUser();

      const { status } = await send(
        '/medical-centers',
        { shouldTake5Only: false, lat: 'abc', lon: '0' },
        token,
      );

      expect(status).toBe(400);
    });
  });

  describe('GET /medical-centers/favorites', () => {
    it('отдаёт страницу только избранных центров пользователя с метаданными', async () => {
      const { user, token } = await newUser();
      const [favorite] = await seedCenters(2);
      await db
        .insert(userFavoriteMedicalCenter)
        .values({ userId: user.id, medicalCenterId: favorite.id });

      const { status, body } = await send(
        '/medical-centers/favorites',
        undefined,
        token,
      );

      expect(status).toBe(200);
      expect(body).toMatchObject({ page: 1, hasMore: false });
      const data = body.data as Body[];
      expect(data.map(item => item.id as string)).toEqual([favorite.id]);
      expect(data[0]).toMatchObject({ isFavorite: true });
    });
  });
});
