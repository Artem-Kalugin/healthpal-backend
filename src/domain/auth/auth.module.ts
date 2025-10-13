import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt/jwt.strategy';
import { EnvironmentVariables } from 'declarations';
import { RecoveryService } from './recovery.service';
import { RecoveryController } from './recovery.controller';
import { PasswordModule } from 'src/infrastructure/password/password.module';
import { RedisModule } from 'src/infrastructure/redis/redis.module';

@Module({
  imports: [
    RedisModule,
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
  providers: [AuthService, RecoveryService, JwtStrategy],
  controllers: [AuthController, RecoveryController],
  exports: [AuthService, RecoveryService],
})
export class AuthModule {}
