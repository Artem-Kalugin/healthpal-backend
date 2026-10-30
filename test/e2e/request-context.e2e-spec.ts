import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Redis } from 'ioredis';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from 'src/app.module';
import { configureApp } from 'src/app.setup';
import { SessionService } from 'src/domain/auth/session.service';
import { REDIS_PROVIDER_KEY } from 'src/infrastructure/redis/redis.module';
import { DB, type Database } from 'src/db/db.module';
import { clearDatabase, resetSchema } from '../integration/db';
import { createFactories } from '../integration/factories';

describe('Request context headers (e2e)', () => {
  let app: INestApplication<App>;
  let db: Database;
  let token: string;

  beforeAll(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = testingModule.createNestApplication();
    configureApp(app);
    await app.init();

    db = app.get<Database>(DB);
    await resetSchema(db);
    await clearDatabase(db);
    const user = await createFactories(db).user({ registrationComplete: true });
    const { accessToken } = await app
      .get(SessionService, { strict: false })
      .generateTokens(user, 'e2e');
    token = `Bearer ${accessToken}`;
  });

  afterAll(async () => {
    // RedisModule does not close the connection itself, without this Jest does not exit
    await app.get<Redis>(REDIS_PROVIDER_KEY, { strict: false }).quit();
    await app.close();
  });

  const search = (headers: [string, string][]) => {
    let pending = request(app.getHttpServer())
      .get('/doctors/search')
      .set('Authorization', token);
    for (const [name, value] of headers) pending = pending.set(name, value);

    return pending;
  };

  it.each([
    { title: 'no headers', headers: [] },
    {
      title: 'en / EU',
      headers: [
        ['Accept-Language', 'en'],
        ['X-Region', 'EU'],
      ],
    },
    {
      title: 'ru / RU',
      headers: [
        ['Accept-Language', 'ru'],
        ['X-Region', 'RU'],
      ],
    },
  ] as { title: string; headers: [string, string][] }[])(
    'accepts $title',
    async ({ headers }) => {
      const response = await search(headers);

      expect(response.status).toBe(200);
    },
  );
});
