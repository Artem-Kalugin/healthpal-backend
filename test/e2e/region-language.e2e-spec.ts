import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Redis } from 'ioredis';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from 'src/app.module';
import { configureApp } from 'src/app.setup';
import { Gender, Region } from 'src/db/enums';
import { REDIS_PROVIDER_KEY } from 'src/infrastructure/redis/redis.module';
import { DB, type Database } from 'src/db/db.module';
import { clearDatabase, resetSchema } from '../integration/db';
import { createFactories } from '../integration/factories';

const PASSWORD = 'Password1';
const PHONE = '+79001234567';

interface Doctor {
  id: string;
  name: string;
  description: string;
}

interface Center {
  id: string;
  name: string;
  city: string;
}

describe('Region and language (e2e)', () => {
  let app: INestApplication<App>;
  let db: Database;
  let redis: Redis;
  let token: string;
  let ruDoctorId: string;
  let euDoctorId: string;
  let ruCenterId: string;
  let euCenterId: string;

  beforeAll(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = testingModule.createNestApplication();
    configureApp(app);
    await app.init();

    db = app.get<Database>(DB);
    redis = app.get<Redis>(REDIS_PROVIDER_KEY, { strict: false });
    await resetSchema(db);
    await clearDatabase(db);
    await redis.flushdb();

    const factories = createFactories(db);
    const category = await factories.category();
    const ruCenter = await factories.medicalCenter({
      name: { ru: 'Центр', en: 'Center' },
      city: { ru: 'Москва', en: 'Moscow' },
      region: Region.RU,
    });
    const euCenter = await factories.medicalCenter({
      name: { ru: 'Центр Митте', en: 'Mitte Center' },
      city: { ru: 'Берлин', en: 'Berlin' },
      region: Region.EU,
      timezone: 'Europe/Berlin',
    });
    ruCenterId = ruCenter.id;
    euCenterId = euCenter.id;
    ruDoctorId = (
      await factories.doctor({
        name: { ru: 'Иван', en: 'Ivan' },
        description: { ru: 'Терапевт', en: 'Therapist' },
        medicalCenterId: ruCenter.id,
        categoryId: category.id,
      })
    ).id;
    euDoctorId = (
      await factories.doctor({
        name: { ru: 'Lukas', en: 'Lukas' },
        description: { ru: 'Врач общей практики', en: 'General practitioner' },
        medicalCenterId: euCenter.id,
        categoryId: category.id,
      })
    ).id;

    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        phone: PHONE,
        password: PASSWORD,
        name: 'Иван',
        surname: 'Иванов',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/complete-registration')
      .set(
        'Authorization',
        `Bearer ${(registered.body as { accessToken: string }).accessToken}`,
      )
      .field('birthday', '1990-01-01')
      .field('gender', Gender.MALE)
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: PHONE, password: PASSWORD })
      .expect(201);
    token = `Bearer ${(login.body as { accessToken: string }).accessToken}`;
  });

  afterAll(async () => {
    // RedisModule does not close the connection itself, without this Jest does not exit
    await redis.quit();
    await app.close();
  });

  interface Context {
    region: string;
    language: string;
  }

  const get = (path: string, context?: Context) => {
    const pending = request(app.getHttpServer())
      .get(path)
      .set('Authorization', token);

    return context
      ? pending
          .set('X-Region', context.region)
          .set('Accept-Language', context.language)
      : pending;
  };

  const searchDoctors = async (context?: Context) =>
    (await get('/doctors/search', context).expect(200)).body as {
      data: Doctor[];
    };

  const listCenters = async (context?: Context) =>
    (await get('/medical-centers?shouldTake5Only=false', context).expect(200))
      .body as Center[];

  it('without headers behaves as ru / RU', async () => {
    const { data } = await searchDoctors();
    const centers = await listCenters();

    expect(data).toMatchObject([
      { id: ruDoctorId, name: 'Иван', description: 'Терапевт' },
    ]);
    expect(centers).toMatchObject([
      { id: ruCenterId, name: 'Центр', city: 'Москва' },
    ]);
  });

  it('serves the Berlin catalog in either language for X-Region: EU', async () => {
    const ru = { region: 'EU', language: 'ru' };
    const en = { region: 'EU', language: 'en' };

    expect((await searchDoctors(ru)).data).toMatchObject([
      { id: euDoctorId, description: 'Врач общей практики' },
    ]);
    expect((await searchDoctors(en)).data).toMatchObject([
      { id: euDoctorId, description: 'General practitioner' },
    ]);
    await expect(listCenters(ru)).resolves.toMatchObject([
      { id: euCenterId, name: 'Центр Митте', city: 'Берлин' },
    ]);
    await expect(listCenters(en)).resolves.toMatchObject([
      { id: euCenterId, name: 'Mitte Center', city: 'Berlin' },
    ]);
  });

  it('serves the Russian catalog in English for X-Region: RU', async () => {
    const en = { region: 'RU', language: 'en' };

    expect((await searchDoctors(en)).data).toMatchObject([
      { id: ruDoctorId, name: 'Ivan', description: 'Therapist' },
    ]);
    await expect(listCenters(en)).resolves.toMatchObject([
      { id: ruCenterId, name: 'Center', city: 'Moscow' },
    ]);
  });
});
