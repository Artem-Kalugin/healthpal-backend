import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { AuthError } from 'src/common/errors/auth.error';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'declarations';
// eslint-disable-next-line @typescript-eslint/naming-convention
import Redis from 'ioredis';
import { REDIS_PROVIDER_KEY } from 'src/infrastructure/redis/redis.module';
import { PasswordService } from 'src/infrastructure/password/password.service';

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
      throw new AuthError(
        'Повторный запрос OTP возможен только через 10 секунд',
      );
    }

    const otp = this.generateOtp();
    const otpHash = this.hmac(otp);

    await this.redis.set(otpKey, otpHash, 'EX', this.config.get('OTP_TTL')!);

    return { smsDemoOnly: otp };
  }

  async verifyOtp(phone: string, otp: string) {
    const stored = await this.redis.get(`otp:${phone}`);
    if (!stored) throw new AuthError('Срок действия временного пароля истек');

    const inputHash = this.hmac(otp);
    const isValid = crypto.timingSafeEqual(
      Buffer.from(stored),
      Buffer.from(inputHash),
    );

    if (!isValid) throw new AuthError('Срок действия временного пароля истек');

    await this.redis.del(`otp:${phone}`);

    const token = crypto.randomBytes(24).toString('hex');
    await this.redis.set(
      `recovery:${token}`,
      phone,
      'EX',
      this.config.get('RECOVERY_TTL')!,
    );

    return { recoveryToken: token };
  }

  async resetPassword(
    recoveryToken: string,
    newPassword: string,
    userAgent: string,
  ) {
    const phone = await this.redis.get(`recovery:${recoveryToken}`);

    if (!phone)
      throw new AuthError('Ваш временный пароль истек, попробуйте заново');

    const user = await this.usersService.findOneByPhone(phone);

    const newUserPassword = await this.passwordService.hash(newPassword);

    await this.usersService.changeUserPassword(user.id, newUserPassword);

    await this.redis.del(`recovery:${recoveryToken}`);

    return this.authService.generateTokens(user, userAgent);
  }
}
