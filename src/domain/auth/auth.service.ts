import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { plainToClass } from 'class-transformer';
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

    try {
      const user =
        userPreloaded || (await this.usersService.findOneByPhone(phone));

      if (!user || !(await bcrypt.compare(password, user.password))) {
        throw Error('internal password wrong');
      }

      const payload = this.createJwtPayload(user);
      const accessToken = this.jwtService.sign(payload);

      const userDTO = plainToClass(UserResponseDto, user, {
        enableImplicitConversion: true,
      });
      console.log('data', user, userDTO);
      return {
        accessToken,
        user: userDTO,
      };
    } catch (error) {
      console.log('Error finding by phone', error);
      throw new AuthError('Неверный телефон или пароль');
    }
  }
}
