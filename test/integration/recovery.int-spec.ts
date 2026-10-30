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
import type { UsersService } from 'src/domain/users/users.service';
import type { User } from 'src/db/schema';
import { createTestRedis } from './redis';

const OTP_TTL = 300;
const RECOVERY_TTL = 600;
const PHONE = '+79001234567';

describe('RecoveryService (integration, Redis)', () => {
  let redis: Redis;
  let service: RecoveryService;

  const user = { id: 'user-id', phone: PHONE } as User;
  const usersService = {
    findByPhone: jest.fn(),
    changePassword: jest.fn(),
  };
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

  beforeAll(() => {
    redis = createTestRedis();
    service = new RecoveryService(
      redis,
      usersService as unknown as UsersService,
      sessionService as unknown as SessionService,
      config as unknown as ConfigService<EnvironmentVariables>,
    );
  });

  beforeEach(async () => {
    await redis.flushdb();
    jest.restoreAllMocks();
    usersService.findByPhone.mockReset().mockResolvedValue(user);
    usersService.changePassword.mockReset().mockResolvedValue(undefined);
    sessionService.generateTokens.mockReset();
    sessionService.revokeAllSessions.mockReset();
  });

  afterAll(async () => {
    await redis.quit();
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
      usersService.findByPhone.mockRejectedValue(new UserNotFoundException());

      const error = await rejection(service.requestOtp(PHONE));

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

  describe('resetPassword', () => {
    const issueRecoveryToken = async () => {
      const otp = await requestOtp();

      return (await service.verifyOtp(PHONE, otp)).recoveryToken;
    };

    it('changes the password, invalidates the token and returns login tokens', async () => {
      const recoveryToken = await issueRecoveryToken();
      const tokens = { accessToken: 'a', refreshToken: 'r', user };
      sessionService.generateTokens.mockResolvedValue(tokens);

      const result = await service.resetPassword(recoveryToken, 'NewPassword1');

      expect(usersService.changePassword).toHaveBeenCalledWith(
        user.id,
        'NewPassword1',
      );
      expect(sessionService.revokeAllSessions).toHaveBeenCalledWith(user.id);
      expect(sessionService.generateTokens).toHaveBeenCalledWith(user);
      expect(result).toBe(tokens);
      expect(await redis.get(`recovery:${recoveryToken}`)).toBeNull();
    });

    it('the token is single-use: a repeated reset with it is rejected', async () => {
      const recoveryToken = await issueRecoveryToken();
      sessionService.generateTokens.mockResolvedValue({});
      await service.resetPassword(recoveryToken, 'NewPassword1');

      const error = await rejection(
        service.resetPassword(recoveryToken, 'NewPassword2'),
      );

      expect(error).toMatchObject({ code: ErrorCode.TEMP_PASSWORD_EXPIRED });
      expect(usersService.changePassword).toHaveBeenCalledTimes(1);
    });

    it('unknown or expired token → error code, the password is unchanged', async () => {
      const error = await rejection(
        service.resetPassword('unknown', 'NewPassword1'),
      );

      expect(error).toMatchObject({ code: ErrorCode.TEMP_PASSWORD_EXPIRED });
      expect(usersService.changePassword).not.toHaveBeenCalled();
    });
  });
});
