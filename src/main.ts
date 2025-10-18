import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';

import {
  BadRequestException,
  ClassSerializerInterceptor,
  ValidationPipe,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DatabaseEntityErrorFilter } from './common/errors/database-entity/database-entity-error.filter';

console.log('teszt');
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
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
  const config = new DocumentBuilder()
    .setTitle('HealthPal API')
    .setDescription('Demo API for RN showcase')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Введите JWT токен',
        in: 'header',
      },
      'JWT',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch(error => {
  console.error(error);
  process.exit(1);
});
