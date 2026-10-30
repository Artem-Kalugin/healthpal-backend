import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './domain/users/users.module';
import { AuthModule } from './domain/auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthWithRegistrationGuard } from './domain/auth/jwt/jwt-auth-with-registration.guard';
import { environmentValidationSchema } from './env.schema';
import { OnboardingSlidesModule } from './domain/onboarding-slides/onboarding-slides.module';
import { MedicalCenterModule } from './domain/medical-center/medical-center.module';
import { LoggerMiddleware } from './common/middlewares/console.logger';
import { DoctorModule } from './domain/doctor/doctor.module';
import { AppointmentModule } from './domain/appointment/appointment.module';
import { HealthModule } from './infrastructure/health/health.module';
import { TerminusModule } from '@nestjs/terminus';
import { DbModule } from './db/db.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: environmentValidationSchema,
      validationOptions: {
        abortEarly: true,
      },
    }),
    TerminusModule.forRoot({
      gracefulShutdownTimeoutMs: 1000,
    }),
    DbModule,
    AppointmentModule,
    UsersModule,
    AuthModule,
    OnboardingSlidesModule,
    DoctorModule,
    MedicalCenterModule,
    HealthModule,
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
