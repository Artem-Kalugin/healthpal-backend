import { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from 'declarations';
// eslint-disable-next-line @typescript-eslint/naming-convention
import type Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { AuthError } from 'src/common/errors/auth.error';
import { createSafeRepository } from 'src/common/helpers/safe-repository.provider';
import { AuthService } from 'src/domain/auth/auth.service';
import { UsersService } from 'src/domain/users/users.service';
import { User } from 'src/entities/user.entity';
import type { ImageFileStorageService } from 'src/infrastructure/file-storage/image-file-storage.service';
import { PasswordService } from 'src/infrastructure/password/password.service';
import { clearDatabase, createTestDataSource } from './db';
import { createFactories } from './factories';
import { createTestRedis } from './redis';
import { freezeDate } from './time';

/* eslint-disable sonarjs/no-hardcoded-passwords */
const PASSWORD = 'Password1';
const WRONG_PASSWORD = 'Password2';
/* eslint-enable sonarjs/no-hardcoded-passwords */
const SID = 'session-1';
const ACCESS_TTL = 3600;
// отличается от ACCESS_TTL, чтобы тест различал, какой токен получил какой срок
const REFRESH_TTL = 7200;
const T0 = new Date('2026-10-29T12:00:00Z');
const T1 = new Date('2026-10-29T12:00:10Z');

interface TokenClaims {
  id: string;
  registrationComplete: boolean;
  sid: string;
  iat: number;
  exp: number;
}

describe('AuthService (integration)', () => {
  let dataSource: DataSource;
  let factories: ReturnType<typeof createFactories>;
  let redis: Redis;
  let jwtService: JwtService;
  let service: AuthService;
  let phone: string;
  let user: User;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    factories = createFactories(dataSource);
    redis = createTestRedis();
    jwtService = new JwtService({
      secret: 'int-secret-at-least-32-characters-long',
      signOptions: { expiresIn: ACCESS_TTL },
    });
    const passwordService = new PasswordService();
    const usersService = new UsersService(
      createSafeRepository(dataSource.getRepository(User)),
      {} as ImageFileStorageService,
      passwordService,
      dataSource,
    );
    /* eslint-disable @typescript-eslint/naming-convention */
    const config = {
      get: (key: string) => ({ JWT_REFRESH_TTL: REFRESH_TTL })[key],
    };
    /* eslint-enable @typescript-eslint/naming-convention */

    service = new AuthService(
      usersService,
      jwtService,
      passwordService,
      config as unknown as ConfigService<EnvironmentVariables>,
      redis,
    );
  });

  beforeEach(async () => {
    jest.useRealTimers();
    await clearDatabase(dataSource);
    await redis.flushdb();
    const password = await new PasswordService().hash(PASSWORD);

    user = await factories.user({ password });
    phone = user.phone;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(async () => {
    await redis.quit();
    await dataSource.destroy();
  });

  const refreshKey = (userId = user.id, sid = SID) =>
    `refresh:${userId}:${sid}`;

  const claims = (token: string) => jwtService.verify<TokenClaims>(token);

  const rejection = (promise: Promise<unknown>) =>
    promise.then(
      () => undefined,
      (error: unknown) => error,
    );

  describe('login', () => {
    it('верные данные → токены, пользователь и refresh-токен в Redis', async () => {
      const result = await service.login({ phone, password: PASSWORD });

      expect(result.user.id).toBe(user.id);
      expect(claims(result.accessToken).id).toBe(user.id);
      const { sid } = claims(result.refreshToken);
      expect(await redis.get(refreshKey(user.id, sid))).toBe(
        result.refreshToken,
      );
    });

    it.each([
      {
        name: 'неверный пароль',
        dto: () => ({ phone, password: WRONG_PASSWORD }),
      },
      {
        name: 'неизвестный телефон',
        dto: () => ({ phone: '+70000000000', password: PASSWORD }),
      },
    ])('$name → AuthError, сессия не создаётся', async ({ dto }) => {
      const error = await rejection(service.login(dto()));

      expect(error).toBeInstanceOf(AuthError);
      expect(await redis.keys('refresh:*')).toEqual([]);
    });
  });

  describe('generateTokens', () => {
    it.each([false, true])(
      'в payload id и registrationComplete=%s, у refresh свой срок жизни',
      async registrationComplete => {
        const tokens = await service.generateTokens(
          { ...user, registrationComplete },
          SID,
        );

        const access = claims(tokens.accessToken);
        const refresh = claims(tokens.refreshToken);

        expect(access).toMatchObject({ id: user.id, registrationComplete });
        expect(refresh).toMatchObject({ id: user.id, registrationComplete });
        expect(access.exp - access.iat).toBe(ACCESS_TTL);
        expect(refresh.exp - refresh.iat).toBe(REFRESH_TTL);
      },
    );

    it('refresh-токен хранится по ключу пользователя и sid со сроком жизни', async () => {
      const tokens = await service.generateTokens(user, SID);

      expect(await redis.get(refreshKey())).toBe(tokens.refreshToken);
      expect(await redis.ttl(refreshKey())).toBeGreaterThan(REFRESH_TTL - 5);
      expect(await redis.ttl(refreshKey())).toBeLessThanOrEqual(REFRESH_TTL);
    });

    it('без sid каждый вызов создаёт новую сессию, refresh-токен несёт её sid', async () => {
      const first = await service.generateTokens(user);
      const second = await service.generateTokens(user);

      const firstSid = claims(first.refreshToken).sid;
      const secondSid = claims(second.refreshToken).sid;
      expect(firstSid).not.toBe(secondSid);
      expect(await redis.get(refreshKey(user.id, firstSid))).toBe(
        first.refreshToken,
      );
      expect(await redis.get(refreshKey(user.id, secondSid))).toBe(
        second.refreshToken,
      );
    });

    it('разные sid живут независимо, тот же sid перезаписывается', async () => {
      freezeDate(T0);
      const phoneSession = await service.generateTokens(user, 'phone');
      const tabletSession = await service.generateTokens(user, 'tablet');
      freezeDate(T1);
      const phoneSessionNew = await service.generateTokens(user, 'phone');

      expect(await redis.get(refreshKey(user.id, 'tablet'))).toBe(
        tabletSession.refreshToken,
      );
      expect(await redis.get(refreshKey(user.id, 'phone'))).toBe(
        phoneSessionNew.refreshToken,
      );
      expect(phoneSessionNew.refreshToken).not.toBe(phoneSession.refreshToken);
    });
  });

  describe('refresh', () => {
    it('валидный токен → новая пара, в Redis новый токен', async () => {
      freezeDate(T0);
      const old = await service.generateTokens(user, SID);
      freezeDate(T1);

      const result = await service.refresh(user.id, old.refreshToken);

      expect(result.user.id).toBe(user.id);
      expect(result.refreshToken).not.toBe(old.refreshToken);
      expect(await redis.get(refreshKey())).toBe(result.refreshToken);
    });

    it('токен одноразовый: повторное использование → AuthError', async () => {
      // в одну секунду refresh выдал бы тот же JWT и «старый» токен снова стал бы валидным
      freezeDate(T0);
      const { refreshToken } = await service.generateTokens(user, SID);
      freezeDate(T1);
      await service.refresh(user.id, refreshToken);

      const error = await rejection(service.refresh(user.id, refreshToken));

      expect(error).toBeInstanceOf(AuthError);
    });

    it('параллельные запросы с одним токеном: проходит ровно один', async () => {
      const { refreshToken } = await service.generateTokens(user, SID);

      const results = await Promise.allSettled([
        service.refresh(user.id, refreshToken),
        service.refresh(user.id, refreshToken),
      ]);

      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    });

    it('чужой токен → AuthError и сессия владельца остаётся рабочей', async () => {
      const { refreshToken } = await service.generateTokens(user, SID);

      const error = await rejection(service.refresh(user.id, 'garbage'));

      expect(error).toBeInstanceOf(AuthError);
      expect(await redis.get(refreshKey())).toBe(refreshToken);
    });

    it('нет сессии (ключ удалён или истёк срок) → AuthError', async () => {
      const { refreshToken } = await service.generateTokens(user, SID);
      await redis.del(refreshKey());

      const error = await rejection(service.refresh(user.id, refreshToken));

      expect(error).toBeInstanceOf(AuthError);
    });

    it('токен другого пользователя в запросе → AuthError, сессия остаётся', async () => {
      const { refreshToken } = await service.generateTokens(user, SID);

      const error = await rejection(
        service.refresh('00000000-0000-4000-8000-000000000000', refreshToken),
      );

      expect(error).toBeInstanceOf(AuthError);
      expect(await redis.get(refreshKey())).toBe(refreshToken);
    });

    it('refresh сохраняет sid сессии', async () => {
      freezeDate(T0);
      const { refreshToken } = await service.generateTokens(user, SID);
      freezeDate(T1);

      const result = await service.refresh(user.id, refreshToken);

      expect(claims(result.refreshToken).sid).toBe(SID);
      expect(await redis.keys('refresh:*')).toEqual([refreshKey()]);
    });

    it('пользователь удалён → AuthError, а не 404', async () => {
      const { refreshToken } = await service.generateTokens(user, SID);
      await dataSource.getRepository(User).delete(user.id);

      const error = await rejection(service.refresh(user.id, refreshToken));

      expect(error).toBeInstanceOf(AuthError);
    });
  });
});
