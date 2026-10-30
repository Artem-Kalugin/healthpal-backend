import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Redis } from 'ioredis';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from 'src/app.module';
import { configureApp } from 'src/app.setup';
import { ErrorCode } from 'src/common/errors/error-code';
import { AuthService } from 'src/domain/auth/auth.service';
import { REDIS_PROVIDER_KEY } from 'src/infrastructure/redis/redis.module';
import { userFavoriteMedicalCenter } from 'src/db/schema';
import { DB, type Database } from 'src/db/db.module';
import { clearDatabase, resetSchema } from '../integration/db';
import { createFactories } from '../integration/factories';

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

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
    // RedisModule does not close the connection itself, without this Jest does not exit
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

  /** Centers on the equator: the i-th at 0.01·i degrees of longitude from the point (0, 0). */
  const seedCenters = async (count: number) => {
    const centers: { id: string }[] = [];
    for (let index = 1; index <= count; index++) {
      centers.push(await factories.medicalCenter({ lat: 0, lon: index / 100 }));
    }

    return centers;
  };

  it('without a token responds 401 UNAUTHORIZED', async () => {
    const { status, body } = await send('/medical-centers');

    expect(status).toBe(401);
    expect(body).toEqual({ statusCode: 401, code: ErrorCode.UNAUTHORIZED });
  });

  describe('GET /medical-centers', () => {
    it('without lat/lon returns centers by rating without distance; shouldTake5Only arrives as a string and is parsed correctly', async () => {
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

    it('with lat and lon returns distance and walkingTimeMinutes, lat/lon arrive as strings', async () => {
      const { token } = await newUser();
      const [nearest] = await seedCenters(2);

      const { status, body } = await send(
        '/medical-centers',
        { shouldTake5Only: false, lat: '0', lon: '0' },
        token,
      );

      expect(status).toBe(200);
      expect(body[0]).toMatchObject({
        id: nearest.id,
        distance: 1.1,
        walkingTimeMinutes: 13,
      });
    });

    it('rejects a non-numeric lat with VALIDATION_FAILED', async () => {
      const { token } = await newUser();

      const { status, body } = await send(
        '/medical-centers',
        { shouldTake5Only: false, lat: 'abc', lon: '0' },
        token,
      );

      expect(status).toBe(400);
      expect(body).toEqual({
        statusCode: 400,
        code: 'VALIDATION_FAILED',
        validation: { lat: [{ code: 'NUMBER_FORMAT' }] },
      });
    });

    it.each([
      ['lat', 'lon'],
      ['lon', 'lat'],
    ])('rejects %s without %s', async (given, missing) => {
      const { token } = await newUser();

      const { status, body } = await send(
        '/medical-centers',
        { shouldTake5Only: false, [given]: '0' },
        token,
      );

      expect(status).toBe(400);
      expect(body).toEqual({
        statusCode: 400,
        code: 'VALIDATION_FAILED',
        validation: {
          [missing]: [{ code: 'NUMBER_FORMAT' }, { code: 'NOT_STRING' }],
        },
      });
    });
  });

  describe('GET /medical-centers/favorites', () => {
    it('returns a page of only the favorite centers of the user with metadata', async () => {
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

  describe('POST and DELETE /medical-centers/:id/favorite', () => {
    const call = (method: 'post' | 'delete', id: string, token: string) =>
      request(app.getHttpServer())
        [method](`/medical-centers/${id}/favorite`)
        .set('Authorization', token);

    it('POST adds to favorites → 201, repeated → 409 FAVORITE_ALREADY_EXISTS', async () => {
      const { user, token } = await newUser();
      const target = await factories.medicalCenter();

      const created = await call('post', target.id, token);
      const repeated = await call('post', target.id, token);

      expect(created.status).toBe(201);
      expect(created.body).toEqual({
        success: true,
        medicalCenterId: target.id,
      });
      expect(repeated.status).toBe(409);
      expect(repeated.body).toEqual({
        statusCode: 409,
        code: 'FAVORITE_ALREADY_EXISTS',
      });
      expect(await db.select().from(userFavoriteMedicalCenter)).toMatchObject([
        { userId: user.id, medicalCenterId: target.id },
      ]);
    });

    it('POST for a nonexistent center → 404 MEDICAL_CENTER_NOT_FOUND', async () => {
      const { token } = await newUser();

      const response = await call('post', UNKNOWN_ID, token);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        statusCode: 404,
        code: 'MEDICAL_CENTER_NOT_FOUND',
      });
    });

    it('DELETE removes only the link of this user', async () => {
      const { user, token } = await newUser();
      const other = await newUser();
      const target = await factories.medicalCenter();
      await db.insert(userFavoriteMedicalCenter).values([
        { userId: user.id, medicalCenterId: target.id },
        { userId: other.user.id, medicalCenterId: target.id },
      ]);

      const response = await call('delete', target.id, token);

      expect(response.status).toBe(200);
      expect(await db.select().from(userFavoriteMedicalCenter)).toMatchObject([
        { userId: other.user.id, medicalCenterId: target.id },
      ]);
    });

    it('invalid id → 400 VALIDATION_FAILED', async () => {
      const { token } = await newUser();

      const response = await call('post', 'not-a-uuid', token);

      expect(response.status).toBe(400);
    });
  });
});
