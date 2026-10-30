import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Redis } from 'ioredis';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from 'src/app.module';
import { configureApp } from 'src/app.setup';
import { ScheduleDay } from 'src/db/enums';
import { userFavoriteDoctor } from 'src/db/schema';
import { AuthService } from 'src/domain/auth/auth.service';
import { REDIS_PROVIDER_KEY } from 'src/infrastructure/redis/redis.module';
import { DB, type Database } from 'src/db/db.module';
import { clearDatabase, resetSchema } from '../integration/db';
import { createFactories } from '../integration/factories';

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

type Body = Record<string, any>;

describe('Doctors (e2e)', () => {
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

  it('без токена все эндпоинты отвечают 401', async () => {
    const urls = [
      '/doctors/search',
      '/doctors/favorites',
      `/doctors/${UNKNOWN_ID}`,
    ];

    for (const url of urls) {
      const { status } = await send(url);
      expect(status).toBe(401);
    }
  });

  describe('GET /doctors/search', () => {
    it('отдаёт страницу врачей в формате ответа с isFavorite и метаданными', async () => {
      const { user, token } = await newUser();
      const [first, second] = [
        await factories.doctor({ name: 'Анна' }),
        await factories.doctor({ name: 'Борис' }),
      ];
      await db
        .insert(userFavoriteDoctor)
        .values({ userId: user.id, doctorId: first.id });

      const { status, body } = await send(
        '/doctors/search',
        { page: 1, size: 10 },
        token,
      );

      expect(status).toBe(200);
      expect(body).toMatchObject({ page: 1, size: 10, hasMore: false });
      const byId = new Map(
        (body.data as Body[]).map(item => [item.id as string, item]),
      );
      expect(byId.get(first.id)).toMatchObject({
        name: 'Анна',
        isFavorite: true,
      });
      expect(byId.get(second.id)).toMatchObject({ isFavorite: false });
    });

    it.each([
      { title: 'sort вне списка', query: { sort: 'name' } },
      { title: 'слишком короткий searchFor', query: { searchFor: 'ab' } },
      { title: 'size меньше минимума', query: { size: 5 } },
    ])('$title → 400', async ({ query }) => {
      const { token } = await newUser();

      const { status } = await send('/doctors/search', query, token);

      expect(status).toBe(400);
    });
  });

  describe('GET /doctors/favorites', () => {
    it('отдаёт только избранных врачей пользователя', async () => {
      const { user, token } = await newUser();
      const favorite = await factories.doctor();
      await factories.doctor();
      await db
        .insert(userFavoriteDoctor)
        .values({ userId: user.id, doctorId: favorite.id });

      const { status, body } = await send(
        '/doctors/favorites',
        undefined,
        token,
      );

      expect(status).toBe(200);
      expect((body.data as Body[]).map(item => item.id as string)).toEqual([
        favorite.id,
      ]);
    });
  });

  describe('GET /doctors/:id', () => {
    it('отдаёт врача', async () => {
      const { token } = await newUser();
      const doctor = await factories.doctor();

      const { status, body } = await send(
        `/doctors/${doctor.id}`,
        undefined,
        token,
      );

      expect(status).toBe(200);
      expect(body).toMatchObject({ id: doctor.id, isFavorite: false });
    });

    it('несуществующий врач → 404 DOCTOR_NOT_FOUND', async () => {
      const { token } = await newUser();

      const { status, body } = await send(
        `/doctors/${UNKNOWN_ID}`,
        undefined,
        token,
      );

      expect(status).toBe(404);
      expect(body).toEqual({ statusCode: 404, code: 'DOCTOR_NOT_FOUND' });
    });

    it('неизвестный маршрут → 404 NOT_FOUND в общем формате', async () => {
      const { status, body } = await send('/doctors/no/such/route');

      expect(status).toBe(404);
      expect(body).toEqual({ statusCode: 404, code: 'NOT_FOUND' });
    });
  });

  describe('GET /doctors/:id/time-slots', () => {
    it('врач без свободных слотов → 200 и пустой список', async () => {
      const { token } = await newUser();
      const doctor = await factories.doctor();

      const response = await request(app.getHttpServer())
        .get(`/doctors/${doctor.id}/time-slots`)
        .query({ startDate: '2026-11-01', endDate: '2026-11-30' })
        .set('Authorization', token);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /doctors/:id/schedule', () => {
    it('отдаёт расписание врача по дням недели', async () => {
      const { token } = await newUser();
      const doctor = await factories.doctor();
      await factories.schedule(doctor.id);

      const { status, body } = await send(
        `/doctors/${doctor.id}/schedule`,
        undefined,
        token,
      );

      expect(status).toBe(200);
      expect(body[ScheduleDay.MONDAY]).toEqual([
        { start: '09:00', end: '13:00' },
      ]);
    });
  });
});
