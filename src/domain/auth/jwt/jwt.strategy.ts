import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { JwtContent } from 'src/common/types/jwt-content.type';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'declarations';
import { AuthError } from 'src/common/errors/database-entity/auth.error';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey:
        configService.get<EnvironmentVariables['JWT_SECRET']>('JWT_SECRET')!,
    });
  }

  async validate(payload: JwtContent): Promise<JwtContent> {
    const user = await this.usersService.findOne(payload.id);

    if (!user) {
      throw new AuthError('Недействительный токен');
    }

    return this.authService.createJwtPayload(user);
  }
}
