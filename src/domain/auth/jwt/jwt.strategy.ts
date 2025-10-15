import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables, JwtContent } from 'declarations';
import { AuthError } from 'src/common/errors/auth.error';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_SECRET')!,
    });
  }

  async validate(payload: JwtContent): Promise<JwtContent> {
    const user = await this.usersService.findOne(payload.id);

    if (!user) {
      throw new AuthError('Недействительный токен');
    }

    return this.authService.getJwtPayload(user);
  }
}
