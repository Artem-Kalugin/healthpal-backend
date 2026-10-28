import {
  BadRequestException,
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DatabaseEntityErrorFilter } from './common/errors/database-entity/database-entity-error.filter';

/** Глобальные pipe, фильтры и интерсепторы: общие для `main.ts` и e2e-тестов. */
export function configureApp(app: INestApplication) {
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidUnknownValues: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (validationErrors = []) => {
        const formattedErrors = validationErrors.reduce(
          (accumulator, error) => {
            if (error.constraints) {
              accumulator[error.property] = Object.values(error.constraints);
            }
            return accumulator;
          },
          {} as Record<string, string[]>,
        );

        return new BadRequestException({
          validation: formattedErrors,
        });
      },
    }),
  );

  app.useGlobalFilters(new DatabaseEntityErrorFilter());
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector), {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    }),
  );
}
