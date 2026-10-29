import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables, JwtContent } from 'declarations';
import { UsersService } from 'src/domain/users/users.service';
import { UserNotFoundException } from 'src/domain/users/exceptions/user-not-found.exception';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService<EnvironmentVariables>,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_SECRET')!,
    });
  }

  async validate(payload: JwtContent): Promise<JwtContent> {
    try {
      await this.usersService.findOne(payload.id);
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        throw new UnauthorizedException();
      }
      throw error;
    }

    return payload;
  }
}
