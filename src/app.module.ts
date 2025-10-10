import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './domain/users/users.module';
import { User } from './entities/user.entity';
import { AuthModule } from './domain/auth/auth.module';

import { APP_GUARD } from '@nestjs/core';
import { JwtAuthWithRegistrationGuard } from './domain/auth/jwt/jwt-auth-with-registration.guard';
import { environmentValidationSchema } from './env.schema';
import { OnboardingSlidesModule } from './domain/onboarding-slides/onboarding-slides.module';
import { OnboardingSlide } from './entities/onboarding-slide.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: environmentValidationSchema,
      validationOptions: {
        abortEarly: true,
      },
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: Number(process.env.DATABASE_PORT) ?? 5432,
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME ?? 'HealthPal',
      entities: [User, OnboardingSlide],
      synchronize: true,
      logging: true,
    }),
    UsersModule,
    AuthModule,
    OnboardingSlidesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthWithRegistrationGuard,
    },
  ],
})
export class AppModule {}
