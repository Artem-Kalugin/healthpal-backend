import { ErrorCode } from 'src/common/errors/error-code';
import crypto from 'crypto';
import type { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from 'declarations';
// eslint-disable-next-line @typescript-eslint/naming-convention
import type Redis from 'ioredis';
import type { AuthService } from 'src/domain/auth/auth.service';
import {
  OTP_MAX_ATTEMPTS,
  OTP_MAX_REQUESTS,
  RecoveryService,
} from 'src/domain/auth/recovery.service';
import { UserNotFoundException } from 'src/domain/users/exceptions/user-not-found.exception';
import type { UsersService } from 'src/domain/users/users.service';
import type { PasswordService } from 'src/infrastructure/password/password.service';
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
    findOneByPhone: jest.fn(),
    changeUserPassword: jest.fn(),
  };
  const authService = {
    generateTokens: jest.fn(),
    revokeAllSessions: jest.fn(),
  };
  const passwordService = { hash: jest.fn() };
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
      authService as unknown as AuthService,
      passwordService as unknown as PasswordService,
      config as unknown as ConfigService<EnvironmentVariables>,
    );
  });

  beforeEach(async () => {
    await redis.flushdb();
    jest.restoreAllMocks();
    usersService.findOneByPhone.mockReset().mockResolvedValue(user);
    usersService.changeUserPassword.mockReset().mockResolvedValue(undefined);
    authService.generateTokens.mockReset();
    authService.revokeAllSessions.mockReset();
    passwordService.hash.mockReset().mockResolvedValue('new-hash');
  });

  afterAll(async () => {
    await redis.quit();
  });

  // лок «не чаще раза в 10 секунд» проверяется отдельно, в остальных тестах мешает
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
    it('неизвестный телефон → UserNotFound, лок и OTP не создаются', async () => {
      usersService.findOneByPhone.mockRejectedValue(
        new UserNotFoundException(),
      );

      const error = await rejection(service.requestOtp(PHONE));

      expect(error).toBeInstanceOf(UserNotFoundException);
      expect(await redis.keys('*')).toEqual([]);
    });

    it('OTP дополняется нулями до 5 цифр', async () => {
      jest.spyOn(crypto, 'randomInt').mockReturnValue(42 as never);

      expect(await requestOtp()).toBe('00042');
    });

    it('в Redis лежит хеш, а не сам OTP, с TTL OTP_TTL', async () => {
      const otp = await requestOtp();

      const stored = await redis.get(`otp:${PHONE}`);
      const ttl = await redis.ttl(`otp:${PHONE}`);

      expect(stored).not.toBeNull();
      expect(stored).not.toContain(otp);
      expect(ttl).toBeGreaterThan(OTP_TTL - 5);
      expect(ttl).toBeLessThanOrEqual(OTP_TTL);
    });

    it('повторный запрос в пределах лока → код ошибки, прежний OTP не перезаписан', async () => {
      await service.requestOtp(PHONE);
      const before = await redis.get(`otp:${PHONE}`);

      const error = await rejection(service.requestOtp(PHONE));

      expect(error).toMatchObject({ code: ErrorCode.OTP_RATE_LIMITED });
      expect(await redis.get(`otp:${PHONE}`)).toBe(before);
    });

    it('сверх OTP_MAX_REQUESTS запросов в окне → код ошибки, OTP не перезаписан', async () => {
      for (let index = 0; index < OTP_MAX_REQUESTS; index++) await requestOtp();
      const before = await redis.get(`otp:${PHONE}`);

      const error = await rejection(requestOtp());

      expect(error).toMatchObject({ code: ErrorCode.OTP_RATE_LIMITED });
      expect(await redis.get(`otp:${PHONE}`)).toBe(before);
    });
  });

  describe('verifyOtp', () => {
    it('верный код → токен восстановления с TTL RECOVERY_TTL, привязанный к телефону', async () => {
      const otp = await requestOtp();

      const { recoveryToken } = await service.verifyOtp(PHONE, otp);

      expect(await redis.get(`recovery:${recoveryToken}`)).toBe(PHONE);
      expect(await redis.ttl(`recovery:${recoveryToken}`)).toBeGreaterThan(
        RECOVERY_TTL - 5,
      );
    });

    it('OTP одноразовый: повторная проверка того же кода → код ошибки', async () => {
      const otp = await requestOtp();
      await service.verifyOtp(PHONE, otp);

      const error = await rejection(service.verifyOtp(PHONE, otp));

      expect(error).toMatchObject({ code: ErrorCode.TEMP_PASSWORD_EXPIRED });
    });

    it('OTP не запрашивали или он истёк → код ошибки', async () => {
      const error = await rejection(service.verifyOtp(PHONE, '12345'));

      expect(error).toMatchObject({ code: ErrorCode.TEMP_PASSWORD_EXPIRED });
    });

    it('неверный код → код ошибки, токен не создан, настоящий OTP ещё валиден', async () => {
      const otp = await requestOtp();

      const error = await rejection(service.verifyOtp(PHONE, wrongOtp(otp)));

      expect(error).toMatchObject({ code: ErrorCode.TEMP_PASSWORD_EXPIRED });
      expect(await redis.keys('recovery:*')).toEqual([]);
      await expect(service.verifyOtp(PHONE, otp)).resolves.toHaveProperty(
        'recoveryToken',
      );
    });

    it('после OTP_MAX_ATTEMPTS неверных кодов OTP сгорает, даже верный код не проходит', async () => {
      const otp = await requestOtp();
      for (let index = 0; index < OTP_MAX_ATTEMPTS; index++) {
        await rejection(service.verifyOtp(PHONE, wrongOtp(otp)));
      }

      const error = await rejection(service.verifyOtp(PHONE, otp));

      expect(error).toMatchObject({ code: ErrorCode.TEMP_PASSWORD_EXPIRED });
      expect(await redis.keys('recovery:*')).toEqual([]);
    });

    it('попытки на единицу меньше лимита не сжигают OTP', async () => {
      const otp = await requestOtp();
      for (let index = 0; index < OTP_MAX_ATTEMPTS - 1; index++) {
        await rejection(service.verifyOtp(PHONE, wrongOtp(otp)));
      }

      await expect(service.verifyOtp(PHONE, otp)).resolves.toHaveProperty(
        'recoveryToken',
      );
    });

    it('новый requestOtp обнуляет счётчик неверных попыток', async () => {
      const first = await requestOtp();
      for (let index = 0; index < OTP_MAX_ATTEMPTS - 1; index++) {
        await rejection(service.verifyOtp(PHONE, wrongOtp(first)));
      }
      const second = await requestOtp();

      await rejection(service.verifyOtp(PHONE, wrongOtp(second)));

      // иначе эта попытка стала бы пятой и сожгла OTP
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

    it('сохраняет хеш (не пароль), гасит токен и возвращает токены входа', async () => {
      const recoveryToken = await issueRecoveryToken();
      const tokens = { accessToken: 'a', refreshToken: 'r', user };
      authService.generateTokens.mockResolvedValue(tokens);

      const result = await service.resetPassword(recoveryToken, 'NewPassword1');

      expect(passwordService.hash).toHaveBeenCalledWith('NewPassword1');
      expect(usersService.changeUserPassword).toHaveBeenCalledWith(
        user.id,
        'new-hash',
      );
      expect(authService.revokeAllSessions).toHaveBeenCalledWith(user.id);
      expect(authService.generateTokens).toHaveBeenCalledWith(user);
      expect(result).toBe(tokens);
      expect(await redis.get(`recovery:${recoveryToken}`)).toBeNull();
    });

    it('токен одноразовый: повторный сброс с ним отклоняется', async () => {
      const recoveryToken = await issueRecoveryToken();
      authService.generateTokens.mockResolvedValue({});
      await service.resetPassword(recoveryToken, 'NewPassword1');

      const error = await rejection(
        service.resetPassword(recoveryToken, 'NewPassword2'),
      );

      expect(error).toMatchObject({ code: ErrorCode.TEMP_PASSWORD_EXPIRED });
      expect(usersService.changeUserPassword).toHaveBeenCalledTimes(1);
    });

    it('неизвестный или истёкший токен → код ошибки, пароль не меняется', async () => {
      const error = await rejection(
        service.resetPassword('unknown', 'NewPassword1'),
      );

      expect(error).toMatchObject({ code: ErrorCode.TEMP_PASSWORD_EXPIRED });
      expect(usersService.changeUserPassword).not.toHaveBeenCalled();
    });
  });
});
