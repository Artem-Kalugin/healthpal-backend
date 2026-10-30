import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import type { User } from 'src/db/schema';
import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';
import { PasswordService } from 'src/infrastructure/password/password.service';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'declarations';
// eslint-disable-next-line @typescript-eslint/naming-convention
import Redis from 'ioredis';
import { REDIS_PROVIDER_KEY } from 'src/infrastructure/redis/redis.module';
import { UserNotFoundException } from '../users/exceptions/user-not-found.exception';

// Сверка и удаление атомарны: неверный токен не сжигает чужой ключ,
// а параллельные запросы с одним токеном не пройдут оба.
const CONSUME_REFRESH_TOKEN_SCRIPT = `
  if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
  end
  return 0
`;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
    private readonly config: ConfigService<EnvironmentVariables>,
    @Inject(REDIS_PROVIDER_KEY) private readonly redis: Redis,
  ) {}

  async login(loginDto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: UserResponseDto;
  }> {
    const { phone, password } = loginDto;

    const user = await this.usersService.findOneByPhone(phone).catch(error => {
      throw error instanceof UserNotFoundException
        ? new AppException(ErrorCode.INVALID_CREDENTIALS, {
            message: 'Пользователь не найден',
          })
        : error;
    });

    const isPasswordCorrect = await this.passwordService.compare(
      password,
      user.password,
    );

    if (!isPasswordCorrect) {
      throw new AppException(ErrorCode.INVALID_CREDENTIALS, {
        message: 'Неверный пароль',
      });
    }

    return this.generateTokens(user);
  }

  private getJwtPayload(user: User) {
    return {
      id: user.id,
      registrationComplete: user.registrationComplete,
    };
  }

  // sid идентифицирует сессию (устройство): новый логин создаёт новую,
  // refresh продлевает существующую.
  async generateTokens(user: User, sid: string = randomUUID()) {
    const payload = this.getJwtPayload(user);

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { ...payload, sid },
      {
        secret: this.config.get('JWT_REFRESH_SECRET')!,
        expiresIn: this.config.get('JWT_REFRESH_TTL')!,
      },
    );

    const redisKey = `refresh:${user.id}:${sid}`;
    await this.redis.set(
      redisKey,
      refreshToken,
      'EX',
      this.config.get('JWT_REFRESH_TTL')!,
    );

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  async refresh(userId: string, refreshToken: string) {
    const invalid = () => new AppException(ErrorCode.REFRESH_TOKEN_INVALID);

    let payload: { id: string; sid?: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET')!,
      });
    } catch {
      throw invalid();
    }

    if (payload.id !== userId || !payload.sid) {
      throw invalid();
    }

    const sid = payload.sid;
    const redisKey = `refresh:${userId}:${sid}`;
    const consumed = await this.redis.eval(
      CONSUME_REFRESH_TOKEN_SCRIPT,
      1,
      redisKey,
      refreshToken,
    );

    if (consumed !== 1) {
      throw invalid();
    }

    const user = await this.usersService.findOne(userId).catch(error => {
      // публичный эндпоинт не должен раскрывать, существует ли пользователь
      throw error instanceof UserNotFoundException ? invalid() : error;
    });

    return this.generateTokens(user, sid);
  }
}
