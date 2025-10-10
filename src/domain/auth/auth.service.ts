import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { User } from 'src/entities/user.entity';
import { AuthError } from 'src/common/errors/database-entity/auth.error';
import { PasswordService } from 'src/infrastructure/password/password.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
  ) {}

  async login(
    loginDto: LoginDto,
  ): Promise<{ accessToken: string; user: UserResponseDto }> {
    const { phone, password } = loginDto;

    try {
      const user = await this.usersService.findOneByPhone(phone);

      const isPasswordCorrect = await this.passwordService.compare(
        password,
        user.password,
      );

      if (!isPasswordCorrect) throw new AuthError('Неверный пароль');

      return this.getJwtAccessTokenWithUser(user);
    } catch (error) {
      console.log('Error finding by phone', error);
      throw new AuthError('Неверный телефон или пароль');
    }
  }

  getJwtPayload(user: User) {
    return {
      id: user.id,
      registrationComplete: user.registrationComplete,
    };
  }
  getJwtAccessTokenWithUser(user: User) {
    const jwtPayload = this.getJwtPayload(user);
    const accessToken = this.jwtService.sign(jwtPayload);

    return {
      accessToken,
      user: user,
    };
  }
}
