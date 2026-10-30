import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { UsersService } from 'src/domain/users/users.service';
import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';
import { SessionService } from './session.service';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'declarations';
// eslint-disable-next-line @typescript-eslint/naming-convention
import Redis from 'ioredis';
import { REDIS_PROVIDER_KEY } from 'src/infrastructure/redis/redis.module';

enum OtpCheck {
  MISSING = 0,
  VALID = 1,
  WRONG = 2,
}

/** Wrong inputs per OTP, after which it burns and a new request is needed. */
export const OTP_MAX_ATTEMPTS = 5;
/** OTP requests per phone within the `OTP_REQUESTS_WINDOW_SECONDS` window. */
export const OTP_MAX_REQUESTS = 10;
export const OTP_REQUESTS_WINDOW_SECONDS = 3600;

// Counting the attempt, comparing and burning happen in one step: parallel guesses cannot outrun the attempts limit,
// and of two parallel requests with the right code only one succeeds.
// The compared values are HMACs under a server secret, so a non-constant-time comparison leaks nothing useful.
const VERIFY_OTP_SCRIPT = `
  local stored = redis.call('get', KEYS[1])
  if not stored then
    return ${OtpCheck.MISSING}
  end
  local attempts = redis.call('incr', KEYS[2])
  if attempts == 1 then
    redis.call('expire', KEYS[2], ARGV[3])
  end
  if stored == ARGV[1] then
    redis.call('del', KEYS[1], KEYS[2])
    return ${OtpCheck.VALID}
  end
  if attempts >= tonumber(ARGV[2]) then
    redis.call('del', KEYS[1], KEYS[2])
  end
  return ${OtpCheck.WRONG}
`;

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
    private readonly sessionService: SessionService,
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
    // NX: the TTL is set only on the first request, so the window is fixed and a crash cannot leave a counter without TTL
    const [[, requests]] = (await this.redis
      .multi()
      .incr(requestsKey)
      .expire(requestsKey, OTP_REQUESTS_WINDOW_SECONDS, 'NX')
      .exec())!;
    if ((requests as number) > OTP_MAX_REQUESTS) {
      throw new AppException(ErrorCode.OTP_RATE_LIMITED, {
        message: 'Too many OTP requests within the window',
      });
    }

    const otp = this.generateOtp();
    const otpHash = this.hmac(otp);

    await this.redis
      .multi()
      .set(redisKeys.otp(phone), otpHash, 'EX', this.config.get('OTP_TTL')!)
      .del(redisKeys.otpAttempts(phone))
      .exec();

    return { smsDemoOnly: otp };
  }

  async verifyOtp(phone: string, otp: string) {
    const result = await this.redis.eval(
      VERIFY_OTP_SCRIPT,
      2,
      redisKeys.otp(phone),
      redisKeys.otpAttempts(phone),
      this.hmac(otp),
      OTP_MAX_ATTEMPTS,
      this.config.get('OTP_TTL')!,
    );

    if (result !== OtpCheck.VALID) {
      throw new AppException(ErrorCode.TEMP_PASSWORD_EXPIRED, {
        message:
          result === OtpCheck.MISSING
            ? 'OTP was not requested or has expired'
            : 'Wrong OTP',
      });
    }

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

    await this.usersService.changePassword(user.id, newPassword);

    // a stolen refresh token must not outlive a password change
    await this.sessionService.revokeAllSessions(user.id);

    return this.sessionService.generateTokens(user);
  }
}
