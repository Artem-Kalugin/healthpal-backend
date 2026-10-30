import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { UsersModule } from 'src/domain/users/users.module';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt/jwt.strategy';
import { EnvironmentVariables } from 'declarations';
import { RecoveryService } from './recovery.service';
import { RecoveryController } from './recovery.controller';
import { PasswordModule } from 'src/infrastructure/password/password.module';
import { RedisModule } from 'src/infrastructure/redis/redis.module';
import {
  AUTH_THROTTLE_LIMIT,
  AUTH_THROTTLE_TTL_MS,
} from 'src/common/helpers/decorators/auth-throttle.decorator';
import { JwtAuthWithRegistrationGuard } from './jwt/jwt-auth-with-registration.guard';

@Module({
  imports: [
    RedisModule,
    ThrottlerModule.forRoot([
      { ttl: AUTH_THROTTLE_TTL_MS, limit: AUTH_THROTTLE_LIMIT },
    ]),
    PasswordModule,
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvironmentVariables>) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN'),
        },
      }),
    }),
  ],
  providers: [
    AuthService,
    SessionService,
    RecoveryService,
    JwtAuthWithRegistrationGuard,
    JwtStrategy,
  ],
  controllers: [AuthController, RecoveryController],
  exports: [AuthService, SessionService, RecoveryService],
})
export class AuthModule {}
