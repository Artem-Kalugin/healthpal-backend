import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { User } from 'src/entities/user.entity';
import { AuthError } from 'src/common/errors/auth.error';
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

  async login(
    loginDto: LoginDto,
    userAgent: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: UserResponseDto;
  }> {
    const { phone, password } = loginDto;

    try {
      const user = await this.usersService.findOneByPhone(phone);

      const isPasswordCorrect = await this.passwordService.compare(
        password,
        user.password,
      );

      if (!isPasswordCorrect) throw new AuthError('Неверный пароль');

      return this.generateTokens(user, userAgent);
    } catch {
      throw new AuthError('Неверный телефон или пароль');
    }
  }

  private getJwtPayload(user: User) {
    return {
      id: user.id,
      registrationComplete: user.registrationComplete,
    };
  }

  async generateTokens(user: User, userAgent: string) {
    const payload = this.getJwtPayload(user);

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.config.get('JWT_REFRESH_TTL')!,
    });

    const redisKey = `refresh:${user.id}:${userAgent}`;
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

  async refresh(userId: string, userAgent: string, refreshToken: string) {
    const redisKey = `refresh:${userId}:${userAgent}`;
    const consumed = await this.redis.eval(
      CONSUME_REFRESH_TOKEN_SCRIPT,
      1,
      redisKey,
      refreshToken,
    );

    if (consumed !== 1) {
      throw new AuthError('Refresh токен недействителен или истек');
    }

    const user = await this.usersService.findOne(userId).catch(error => {
      // публичный эндпоинт не должен раскрывать, существует ли пользователь
      throw error instanceof UserNotFoundException
        ? new AuthError('Refresh токен недействителен или истек')
        : error;
    });

    return this.generateTokens(user, userAgent);
  }
}
