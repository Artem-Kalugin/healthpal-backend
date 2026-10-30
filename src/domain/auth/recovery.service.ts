import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { UsersService } from 'src/domain/users/users.service';
import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'declarations';
// eslint-disable-next-line @typescript-eslint/naming-convention
import Redis from 'ioredis';
import { REDIS_PROVIDER_KEY } from 'src/infrastructure/redis/redis.module';
import { PasswordService } from 'src/infrastructure/password/password.service';

/** Wrong inputs per OTP, after which it burns and a new request is needed. */
export const OTP_MAX_ATTEMPTS = 5;
/** OTP requests per phone within the `OTP_REQUESTS_WINDOW_SECONDS` window. */
export const OTP_MAX_REQUESTS = 10;
export const OTP_REQUESTS_WINDOW_SECONDS = 3600;

const redisKeys = {
  otp: (phone: string) => `otp:${phone}`,
  otpLock: (phone: string) => `otp_lock:${phone}`,
  otpRequests: (phone: string) => `otp_requests:${phone}`,
  otpAttempts: (phone: string) => `otp_attempts:${phone}`,
  recovery: (token: string) => `recovery:${token}`,
};

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
    await this.usersService.findByPhone(phone);

    const lockSet = await this.redis.set(
      redisKeys.otpLock(phone),
      '1',
      'EX',
      10,
      'NX',
    );

    if (!lockSet) {
      throw new AppException(ErrorCode.OTP_RATE_LIMITED, {
        message: 'A repeated OTP request is possible only after 10 seconds',
      });
    }

    const requestsKey = redisKeys.otpRequests(phone);
    const requests = await this.redis.incr(requestsKey);
    if (requests === 1) {
      await this.redis.expire(requestsKey, OTP_REQUESTS_WINDOW_SECONDS);
    }
    if (requests > OTP_MAX_REQUESTS) {
      throw new AppException(ErrorCode.OTP_RATE_LIMITED, {
        message: 'Too many OTP requests within the window',
      });
    }

    const otp = this.generateOtp();
    const otpHash = this.hmac(otp);

    await this.redis.set(
      redisKeys.otp(phone),
      otpHash,
      'EX',
      this.config.get('OTP_TTL')!,
    );
    await this.redis.del(redisKeys.otpAttempts(phone));

    return { smsDemoOnly: otp };
  }

  private async registerFailedAttempt(phone: string) {
    const attemptsKey = redisKeys.otpAttempts(phone);
    const attempts = await this.redis.incr(attemptsKey);

    if (attempts === 1) {
      await this.redis.expire(attemptsKey, this.config.get('OTP_TTL')!);
    }

    if (attempts >= OTP_MAX_ATTEMPTS) {
      await this.redis.del(redisKeys.otp(phone), attemptsKey);
    }
  }

  async verifyOtp(phone: string, otp: string) {
    const stored = await this.redis.get(redisKeys.otp(phone));
    if (!stored) {
      throw new AppException(ErrorCode.TEMP_PASSWORD_EXPIRED, {
        message: 'OTP was not requested or has expired',
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
        message: 'Wrong OTP',
      });
    }

    await this.redis.del(redisKeys.otp(phone), redisKeys.otpAttempts(phone));

    const token = crypto.randomBytes(24).toString('hex');
    await this.redis.set(
      redisKeys.recovery(token),
      phone,
      'EX',
      this.config.get('RECOVERY_TTL')!,
    );

    return { recoveryToken: token };
  }

  async resetPassword(recoveryToken: string, newPassword: string) {
    // GETDEL: the token is single-use, a parallel request with the same token gets null
    const phone = await this.redis.getdel(redisKeys.recovery(recoveryToken));

    if (!phone) {
      throw new AppException(ErrorCode.TEMP_PASSWORD_EXPIRED, {
        message: 'Recovery token is unknown or has expired',
      });
    }

    const user = await this.usersService.findByPhone(phone);

    const newUserPassword = await this.passwordService.hash(newPassword);

    await this.usersService.changePassword(user.id, newUserPassword);

    // a stolen refresh token must not outlive a password change
    await this.authService.revokeAllSessions(user.id);

    return this.authService.generateTokens(user);
  }
}
