import { ErrorCode } from 'src/common/errors/error-code';
import crypto from 'crypto';
import type { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from 'declarations';
// eslint-disable-next-line @typescript-eslint/naming-convention
import type Redis from 'ioredis';
import type { SessionService } from 'src/domain/auth/session.service';
import {
  OTP_MAX_ATTEMPTS,
  OTP_MAX_REQUESTS,
  RecoveryService,
} from 'src/domain/auth/recovery.service';
import { UserNotFoundException } from 'src/domain/users/exceptions/user-not-found.exception';
import { UsersService } from 'src/domain/users/users.service';
import type { ImageFileStorageService } from 'src/infrastructure/file-storage/image-file-storage.service';
import { PasswordService } from 'src/infrastructure/password/password.service';
import { eq } from 'drizzle-orm';
import type { Pool } from 'pg';
import type { Database } from 'src/db/db.module';
import { user as userTable } from 'src/db/schema';
import { clearDatabase, createTestDb } from './db';
import { createFactories } from './factories';
import { createTestRedis } from './redis';

const OTP_TTL = 300;
const RECOVERY_TTL = 600;
const PHONE = '+79001234567';
const OLD_PASSWORD = 'OldPassword1';

describe('RecoveryService (integration, Redis)', () => {
  let db: Database;
  let pool: Pool;
  let factories: ReturnType<typeof createFactories>;
  let redis: Redis;
  let service: RecoveryService;
  let user: Awaited<ReturnType<ReturnType<typeof createFactories>['user']>>;

  const passwordService = new PasswordService();
  const sessionService = {
    generateTokens: jest.fn(),
    revokeAllSessions: jest.fn(),
  };
  /* eslint-disable @typescript-eslint/naming-convention */
  const config = {
    get: (key: string) =>
      ({
        OTP_TTL,
        RECOVERY_TTL,
        OTP_HMAC_SECRET: 'int-otp-secret-16+',
      })[key],
  };
  /* eslint-enable @typescript-eslint/naming-convention */

  beforeAll(async () => {
    ({ db, pool } = await createTestDb());
    factories = createFactories(db);
    redis = createTestRedis();
    service = new RecoveryService(
      redis,
      new UsersService(db, {} as ImageFileStorageService, passwordService),
      sessionService as unknown as SessionService,
      config as unknown as ConfigService<EnvironmentVariables>,
    );
  });

  beforeEach(async () => {
    await redis.flushdb();
    await clearDatabase(db);
    jest.restoreAllMocks();
    user = await factories.user({
      phone: PHONE,
      password: await passwordService.hash(OLD_PASSWORD),
    });
    sessionService.generateTokens.mockReset();
    sessionService.revokeAllSessions.mockReset();
  });

  afterAll(async () => {
    await redis.quit();
    await pool.end();
  });

  // the lock "at most once per 10 seconds" is tested separately, in the other tests it gets in the way
  const requestOtp = async (phone = PHONE) => {
    await redis.del(`otp_lock:${phone}`);

    return (await service.requestOtp(phone)).smsDemoOnly;
  };

  const wrongOtp = (otp: string) => (otp === '00000' ? '00001' : '00000');

  const rejection = (promise: Promise<unknown>) =>
    promise.then(
      () => undefined,
      (error: unknown) => error,
    );

  describe('requestOtp', () => {
    it('unknown phone → UserNotFound, no lock and no OTP are created', async () => {
      const error = await rejection(service.requestOtp('+70000000000'));

      expect(error).toBeInstanceOf(UserNotFoundException);
      expect(await redis.keys('*')).toEqual([]);
    });

    it('OTP is zero-padded to 5 digits', async () => {
      jest.spyOn(crypto, 'randomInt').mockReturnValue(42 as never);

      expect(await requestOtp()).toBe('00042');
    });

    it('Redis holds a hash, not the OTP itself, with TTL OTP_TTL', async () => {
      const otp = await requestOtp();

      const stored = await redis.get(`otp:${PHONE}`);
      const ttl = await redis.ttl(`otp:${PHONE}`);

      expect(stored).not.toBeNull();
      expect(stored).not.toContain(otp);
      expect(ttl).toBeGreaterThan(OTP_TTL - 5);
      expect(ttl).toBeLessThanOrEqual(OTP_TTL);
    });

    it('repeated request within the lock → error code, the previous OTP is not overwritten', async () => {
      await service.requestOtp(PHONE);
      const before = await redis.get(`otp:${PHONE}`);

      const error = await rejection(service.requestOtp(PHONE));

      expect(error).toMatchObject({ code: ErrorCode.OTP_RATE_LIMITED });
      expect(await redis.get(`otp:${PHONE}`)).toBe(before);
    });

    it('more than OTP_MAX_REQUESTS requests in the window → error code, OTP is not overwritten', async () => {
      for (let index = 0; index < OTP_MAX_REQUESTS; index++) await requestOtp();
      const before = await redis.get(`otp:${PHONE}`);

      const error = await rejection(requestOtp());

      expect(error).toMatchObject({ code: ErrorCode.OTP_RATE_LIMITED });
      expect(await redis.get(`otp:${PHONE}`)).toBe(before);
    });
  });

  describe('verifyOtp', () => {
    it('valid code → recovery token with TTL RECOVERY_TTL, bound to the phone', async () => {
      const otp = await requestOtp();

      const { recoveryToken } = await service.verifyOtp(PHONE, otp);

      expect(await redis.get(`recovery:${recoveryToken}`)).toBe(PHONE);
      expect(await redis.ttl(`recovery:${recoveryToken}`)).toBeGreaterThan(
        RECOVERY_TTL - 5,
      );
    });

    it('OTP is single-use: re-checking the same code → error code', async () => {
      const otp = await requestOtp();
      await service.verifyOtp(PHONE, otp);

      const error = await rejection(service.verifyOtp(PHONE, otp));

      expect(error).toMatchObject({ code: ErrorCode.TEMP_PASSWORD_EXPIRED });
    });

    it('OTP was not requested or has expired → error code', async () => {
      const error = await rejection(service.verifyOtp(PHONE, '12345'));

      expect(error).toMatchObject({ code: ErrorCode.TEMP_PASSWORD_EXPIRED });
    });

    it('wrong code → error code, no token created, the real OTP is still valid', async () => {
      const otp = await requestOtp();

      const error = await rejection(service.verifyOtp(PHONE, wrongOtp(otp)));

      expect(error).toMatchObject({ code: ErrorCode.TEMP_PASSWORD_EXPIRED });
      expect(await redis.keys('recovery:*')).toEqual([]);
      await expect(service.verifyOtp(PHONE, otp)).resolves.toHaveProperty(
        'recoveryToken',
      );
    });

    it('after OTP_MAX_ATTEMPTS wrong codes the OTP burns, even a valid code fails', async () => {
      const otp = await requestOtp();
      for (let index = 0; index < OTP_MAX_ATTEMPTS; index++) {
        await rejection(service.verifyOtp(PHONE, wrongOtp(otp)));
      }

      const error = await rejection(service.verifyOtp(PHONE, otp));

      expect(error).toMatchObject({ code: ErrorCode.TEMP_PASSWORD_EXPIRED });
      expect(await redis.keys('recovery:*')).toEqual([]);
    });

    it('attempts one below the limit do not burn the OTP', async () => {
      const otp = await requestOtp();
      for (let index = 0; index < OTP_MAX_ATTEMPTS - 1; index++) {
        await rejection(service.verifyOtp(PHONE, wrongOtp(otp)));
      }

      await expect(service.verifyOtp(PHONE, otp)).resolves.toHaveProperty(
        'recoveryToken',
      );
    });

    it('a new requestOtp resets the wrong-attempts counter', async () => {
      const first = await requestOtp();
      for (let index = 0; index < OTP_MAX_ATTEMPTS - 1; index++) {
        await rejection(service.verifyOtp(PHONE, wrongOtp(first)));
      }
      const second = await requestOtp();

      await rejection(service.verifyOtp(PHONE, wrongOtp(second)));

      // otherwise this attempt would be the fifth and burn the OTP
      await expect(service.verifyOtp(PHONE, second)).resolves.toHaveProperty(
        'recoveryToken',
      );
    });
  });

  describe('verifyOtp: concurrency', () => {
    it('parallel wrong guesses cannot exceed OTP_MAX_ATTEMPTS: the rest find the OTP burned', async () => {
      const otp = await requestOtp();

      const errors = await Promise.all(
        Array.from({ length: 50 }, () =>
          rejection(service.verifyOtp(PHONE, wrongOtp(otp))),
        ),
      );

      const messages = errors.map(error => (error as Error).message);
      expect(messages.filter(m => m === 'Wrong OTP')).toHaveLength(
        OTP_MAX_ATTEMPTS,
      );
      expect(
        messages.filter(m => m === 'OTP was not requested or has expired'),
      ).toHaveLength(50 - OTP_MAX_ATTEMPTS);
      expect(await redis.exists(`otp:${PHONE}`)).toBe(0);
    });

    it('parallel requests with the right code: exactly one succeeds', async () => {
      const otp = await requestOtp();

      const results = await Promise.allSettled(
        Array.from({ length: 10 }, () => service.verifyOtp(PHONE, otp)),
      );

      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
      expect(await redis.keys('recovery:*')).toHaveLength(1);
    });
  });

  describe('counters always have a TTL', () => {
    it('requests counter and attempts counter expire', async () => {
      const otp = await requestOtp();
      await rejection(service.verifyOtp(PHONE, wrongOtp(otp)));

      expect(await redis.ttl(`otp_requests:${PHONE}`)).toBeGreaterThan(0);
      expect(await redis.ttl(`otp_attempts:${PHONE}`)).toBeGreaterThan(0);
    });
  });

  describe('resetPassword', () => {
    const issueRecoveryToken = async () => {
      const otp = await requestOtp();

      return (await service.verifyOtp(PHONE, otp)).recoveryToken;
    };

    const storedPassword = async () =>
      (await db.select().from(userTable).where(eq(userTable.id, user.id)))[0]
        .password;

    it('changes the password, invalidates the token and returns login tokens', async () => {
      const recoveryToken = await issueRecoveryToken();
      const tokens = { accessToken: 'a', refreshToken: 'r', user };
      sessionService.generateTokens.mockResolvedValue(tokens);

      const result = await service.resetPassword(recoveryToken, 'NewPassword1');

      expect(
        await passwordService.compare('NewPassword1', await storedPassword()),
      ).toBe(true);
      expect(sessionService.revokeAllSessions).toHaveBeenCalledWith(user.id);
      expect(sessionService.generateTokens).toHaveBeenCalledWith(
        expect.objectContaining({ id: user.id }),
      );
      expect(result).toBe(tokens);
      expect(await redis.get(`recovery:${recoveryToken}`)).toBeNull();
    });

    it('sessions are revoked after the password changes and before new tokens are issued', async () => {
      const recoveryToken = await issueRecoveryToken();
      let isPasswordChangedOnRevoke = false;
      sessionService.revokeAllSessions.mockImplementation(async () => {
        isPasswordChangedOnRevoke = await passwordService.compare(
          'NewPassword1',
          await storedPassword(),
        );
      });
      sessionService.generateTokens.mockResolvedValue({});

      await service.resetPassword(recoveryToken, 'NewPassword1');

      expect(isPasswordChangedOnRevoke).toBe(true);
      expect(
        sessionService.revokeAllSessions.mock.invocationCallOrder[0],
      ).toBeLessThan(sessionService.generateTokens.mock.invocationCallOrder[0]);
    });

    it('the token is single-use: a repeated reset with it is rejected', async () => {
      const recoveryToken = await issueRecoveryToken();
      sessionService.generateTokens.mockResolvedValue({});
      await service.resetPassword(recoveryToken, 'NewPassword1');

      const error = await rejection(
        service.resetPassword(recoveryToken, 'NewPassword2'),
      );

      expect(error).toMatchObject({ code: ErrorCode.TEMP_PASSWORD_EXPIRED });
      expect(
        await passwordService.compare('NewPassword1', await storedPassword()),
      ).toBe(true);
    });

    it('unknown or expired token → error code, the password is unchanged', async () => {
      const error = await rejection(
        service.resetPassword('unknown', 'NewPassword1'),
      );

      expect(error).toMatchObject({ code: ErrorCode.TEMP_PASSWORD_EXPIRED });
      expect(
        await passwordService.compare(OLD_PASSWORD, await storedPassword()),
      ).toBe(true);
    });
  });
});
