import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'declarations';
// eslint-disable-next-line @typescript-eslint/naming-convention
import Redis from 'ioredis';
import { REDIS_PROVIDER_KEY } from 'src/infrastructure/redis/redis.module';
import { PasswordService } from 'src/infrastructure/password/password.service';

/** Неверных вводов на один OTP, после чего он сгорает и нужен новый запрос. */
export const OTP_MAX_ATTEMPTS = 5;
/** Запросов OTP на телефон в окне `OTP_REQUESTS_WINDOW_SECONDS`. */
export const OTP_MAX_REQUESTS = 10;
export const OTP_REQUESTS_WINDOW_SECONDS = 3600;

@Injectable()
export class RecoveryService {
  constructor(
    @Inject(REDIS_PROVIDER_KEY)
    private readonly redis: Redis,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly passwordService: PasswordService,
    private readonly config: ConfigService<EnvironmentVariables>,
  ) {}

  private generateOtp(): string {
    const n = crypto.randomInt(0, 100000);
    return n.toString().padStart(5, '0');
  }

  private hmac(value: string): string {
    return crypto
      .createHmac('sha256', this.config.get('OTP_HMAC_SECRET')!)
      .update(value)
      .digest('hex');
  }

  async requestOtp(phone: string) {
    await this.usersService.findOneByPhone(phone);

    const otpKey = `otp:${phone}`;
    const otpLockKey = `otp_lock:${phone}`;

    const lockSet = await this.redis.set(otpLockKey, '1', 'EX', 10, 'NX');

    if (!lockSet) {
      throw new AppException(ErrorCode.OTP_RATE_LIMITED, {
        message: 'Повторный запрос OTP возможен только через 10 секунд',
      });
    }

    const requestsKey = `otp_requests:${phone}`;
    const requests = await this.redis.incr(requestsKey);
    if (requests === 1) {
      await this.redis.expire(requestsKey, OTP_REQUESTS_WINDOW_SECONDS);
    }
    if (requests > OTP_MAX_REQUESTS) {
      throw new AppException(ErrorCode.OTP_RATE_LIMITED, {
        message: 'Слишком много запросов OTP за окно',
      });
    }

    const otp = this.generateOtp();
    const otpHash = this.hmac(otp);

    await this.redis.set(otpKey, otpHash, 'EX', this.config.get('OTP_TTL')!);
    await this.redis.del(`otp_attempts:${phone}`);

    return { smsDemoOnly: otp };
  }

  private async registerFailedAttempt(phone: string) {
    const attemptsKey = `otp_attempts:${phone}`;
    const attempts = await this.redis.incr(attemptsKey);

    if (attempts === 1) {
      await this.redis.expire(attemptsKey, this.config.get('OTP_TTL')!);
    }

    if (attempts >= OTP_MAX_ATTEMPTS) {
      await this.redis.del(`otp:${phone}`, attemptsKey);
    }
  }

  async verifyOtp(phone: string, otp: string) {
    const stored = await this.redis.get(`otp:${phone}`);
    if (!stored) {
      throw new AppException(ErrorCode.TEMP_PASSWORD_EXPIRED, {
        message: 'OTP не запрашивали или он истёк',
      });
    }

    const inputHash = this.hmac(otp);
    const isValid = crypto.timingSafeEqual(
      Buffer.from(stored),
      Buffer.from(inputHash),
    );

    if (!isValid) {
      await this.registerFailedAttempt(phone);
      throw new AppException(ErrorCode.TEMP_PASSWORD_EXPIRED, {
        message: 'Неверный OTP',
      });
    }

    await this.redis.del(`otp:${phone}`, `otp_attempts:${phone}`);

    const token = crypto.randomBytes(24).toString('hex');
    await this.redis.set(
      `recovery:${token}`,
      phone,
      'EX',
      this.config.get('RECOVERY_TTL')!,
    );

    return { recoveryToken: token };
  }

  async resetPassword(recoveryToken: string, newPassword: string) {
    const phone = await this.redis.get(`recovery:${recoveryToken}`);

    if (!phone) {
      throw new AppException(ErrorCode.TEMP_PASSWORD_EXPIRED, {
        message: 'Токен восстановления неизвестен или истёк',
      });
    }

    const user = await this.usersService.findOneByPhone(phone);

    const newUserPassword = await this.passwordService.hash(newPassword);

    await this.usersService.changeUserPassword(user.id, newUserPassword);

    await this.redis.del(`recovery:${recoveryToken}`);

    return this.authService.generateTokens(user);
  }
}
