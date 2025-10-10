import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { User } from 'src/entities/user.entity';
import { JwtContent } from 'src/common/types/jwt-content.type';
import { AuthError } from 'src/common/errors/database-entity/auth.error';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  createJwtPayload(user: User): JwtContent {
    return {
      id: user.id,
      registrationComplete: user.registrationComplete,
    };
  }

  async login(
    loginDto: LoginDto,
    userPreloaded?: User,
  ): Promise<{ accessToken: string; user: UserResponseDto }> {
    const { phone, password } = loginDto;
    const isSeamless = !!userPreloaded;
    try {
      const user =
        userPreloaded || (await this.usersService.findOneByPhone(phone));

      const isPasswordCorrect = isSeamless
        ? userPreloaded?.password == user.password
        : await bcrypt.compare(password, user.password);

      if (!user || !isPasswordCorrect) {
        throw Error('internal password wrong');
      }

      const payload = this.createJwtPayload(user);
      const accessToken = this.jwtService.sign(payload);

      return {
        accessToken,
        user: user,
      };
    } catch (error) {
      console.log('Error finding by phone', error);
      throw new AuthError('Неверный телефон или пароль');
    }
  }
}
