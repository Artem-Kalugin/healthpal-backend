import { Injectable } from '@nestjs/common';
import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';
import { CreateUserDto } from 'src/domain/users/dto/create-user.dto';
import { UpdateUserDto } from 'src/domain/users/dto/update-user.dto';
import { UserNotFoundException } from 'src/domain/users/exceptions/user-not-found.exception';
import { UsersService } from 'src/domain/users/users.service';
import { PasswordService } from 'src/infrastructure/password/password.service';
import { LoginDto } from './dto/login.dto';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
    private readonly passwordService: PasswordService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);

    return this.sessionService.generateTokens(user);
  }

  async completeRegistration(
    userId: string,
    updateUserDto: UpdateUserDto,
    avatar?: Buffer,
  ) {
    const user = await this.usersService.update(userId, updateUserDto, avatar);

    return this.sessionService.generateTokens(user);
  }

  async login(loginDto: LoginDto) {
    const { phone, password } = loginDto;

    const user = await this.usersService.findByPhone(phone).catch(error => {
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

    return this.sessionService.generateTokens(user);
  }

  async refresh(userId: string, refreshToken: string) {
    const sid = await this.sessionService.consumeRefreshToken(
      userId,
      refreshToken,
    );

    const user = await this.usersService.findById(userId).catch(error => {
      // a public endpoint must not reveal whether the user exists
      throw error instanceof UserNotFoundException
        ? new AppException(ErrorCode.REFRESH_TOKEN_INVALID)
        : error;
    });

    return this.sessionService.generateTokens(user, sid);
  }
}
