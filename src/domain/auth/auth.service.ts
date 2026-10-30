import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/domain/users/users.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from 'src/domain/users/dto/create-user.dto';
import { UpdateUserDto } from 'src/domain/users/dto/update-user.dto';
import { UserResponseDto } from 'src/domain/users/dto/user-response.dto';
import type { User } from 'src/db/schema';
import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';
import { PasswordService } from 'src/infrastructure/password/password.service';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'declarations';
// eslint-disable-next-line @typescript-eslint/naming-convention
import Redis from 'ioredis';
import { REDIS_PROVIDER_KEY } from 'src/infrastructure/redis/redis.module';
import { UserNotFoundException } from 'src/domain/users/exceptions/user-not-found.exception';

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
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
    private readonly config: ConfigService<EnvironmentVariables>,
    @Inject(REDIS_PROVIDER_KEY) private readonly redis: Redis,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);

    return this.generateTokens(user);
  }

  async completeRegistration(
    userId: string,
    updateUserDto: UpdateUserDto,
    avatar?: Buffer,
  ) {
    const user = await this.usersService.update(userId, updateUserDto, avatar);

    return this.generateTokens(user);
  }

  async login(loginDto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: UserResponseDto;
  }> {
    const { phone, password } = loginDto;

    const user = await this.usersService.findOneByPhone(phone).catch(error => {
      throw error instanceof UserNotFoundException
        ? new AppException(ErrorCode.INVALID_CREDENTIALS, {
            message: 'User not found',
          })
        : error;
    });

    const isPasswordCorrect = await this.passwordService.compare(
      password,
      user.password,
    );

    if (!isPasswordCorrect) {
      throw new AppException(ErrorCode.INVALID_CREDENTIALS, {
        message: 'Wrong password',
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

  // sid identifies a session (device): a new login creates a new one,
  // refresh extends the existing one.
  async generateTokens(user: User, sid: string = randomUUID()) {
    const payload = this.getJwtPayload(user);
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
    const consumed = await this.redis.eval(
      CONSUME_REFRESH_TOKEN_SCRIPT,
      1,
      refreshKey(userId, sid),
      refreshToken,
    );

    if (consumed !== 1) {
      throw invalid();
    }

    const user = await this.usersService.findOne(userId).catch(error => {
      // a public endpoint must not reveal whether the user exists
      throw error instanceof UserNotFoundException ? invalid() : error;
    });

    return this.generateTokens(user, sid);
  }
}
