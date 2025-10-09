import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt/jwt.strategy';
import { EnvironmentVariables } from 'declarations';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<EnvironmentVariables['JWT_SECRET']>('JWT_SECRET'),
        signOptions: {
          expiresIn:
            configService.get<EnvironmentVariables['JWT_EXPIRES_IN']>(
              'JWT_EXPIRES_IN',
            ),
        },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
