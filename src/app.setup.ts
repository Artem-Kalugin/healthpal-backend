import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppErrorFilter } from './common/errors/app-error.filter';
import { createValidationException } from './common/errors/validation-exception.factory';

/** shared by `main.ts` and the e2e tests. */
export function configureApp(app: INestApplication) {
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidUnknownValues: true,
      forbidNonWhitelisted: true,
      exceptionFactory: createValidationException,
    }),
  );

  app.useGlobalFilters(new AppErrorFilter());
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector), {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    }),
  );
}
