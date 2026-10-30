import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EnvironmentVariables } from 'declarations';
// eslint-disable-next-line @typescript-eslint/naming-convention
import Redis from 'ioredis';
import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';
import type { User } from 'src/db/schema';
import { REDIS_PROVIDER_KEY } from 'src/infrastructure/redis/redis.module';

// Comparison and deletion are atomic: a wrong token does not burn another user's key,
// and parallel requests with one token cannot both succeed.
const CONSUME_REFRESH_TOKEN_SCRIPT = `
  if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
  end
  return 0
`;

const refreshKey = (userId: string, sid: string) => `refresh:${userId}:${sid}`;

@Injectable()
export class SessionService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<EnvironmentVariables>,
    @Inject(REDIS_PROVIDER_KEY) private readonly redis: Redis,
  ) {}

  // sid identifies a session (device): a new login creates a new one,
  // refresh extends the existing one.
  async generateTokens(user: User, sid: string = randomUUID()) {
    const payload = {
      id: user.id,
      registrationComplete: user.registrationComplete,
    };
    const refreshTtl = this.config.get('JWT_REFRESH_TTL', { infer: true })!;

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { ...payload, sid },
      {
        secret: this.config.get('JWT_REFRESH_SECRET')!,
        expiresIn: refreshTtl,
      },
    );

    await this.redis.set(
      refreshKey(user.id, sid),
      refreshToken,
      'EX',
      refreshTtl,
    );

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  /** Validates the refresh token and burns it; returns the session id to continue. */
  async consumeRefreshToken(userId: string, refreshToken: string) {
    let payload: { id: string; sid?: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET')!,
      });
    } catch {
      throw new AppException(ErrorCode.REFRESH_TOKEN_INVALID);
    }

    if (payload.id !== userId || !payload.sid) {
      throw new AppException(ErrorCode.REFRESH_TOKEN_INVALID);
    }

    const consumed = await this.redis.eval(
      CONSUME_REFRESH_TOKEN_SCRIPT,
      1,
      refreshKey(userId, payload.sid),
      refreshToken,
    );

    if (consumed !== 1) {
      throw new AppException(ErrorCode.REFRESH_TOKEN_INVALID);
    }

    return payload.sid;
  }

  async revokeAllSessions(userId: string) {
    let cursor = '0';
    do {
      const [next, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        refreshKey(userId, '*'),
        'COUNT',
        100,
      );
      cursor = next;
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } while (cursor !== '0');
  }
}
