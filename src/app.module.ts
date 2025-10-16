import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './domain/users/users.module';
import { AuthModule } from './domain/auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthWithRegistrationGuard } from './domain/auth/jwt/jwt-auth-with-registration.guard';
import { environmentValidationSchema } from './env.schema';
import { OnboardingSlidesModule } from './domain/onboarding-slides/onboarding-slides.module';
import { PasswordModule } from './infrastructure/password/password.module';
import { MedicalCentersModule } from './domain/medical-center/medical-center.module';
import { LoggerMiddleware } from './common/middlewares/console.logger';
import { DoctorModule } from './domain/doctor/doctor.module';
import { FavoritesModule } from './domain/favorites/favorites.module';

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
      autoLoadEntities: true,
      synchronize: true,
      logging: true,
    }),
    FavoritesModule,
    UsersModule,
    AuthModule,
    OnboardingSlidesModule,
    DoctorModule,
    MedicalCentersModule,
    PasswordModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthWithRegistrationGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
