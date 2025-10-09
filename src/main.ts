import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { DatabaseEntityErrorFilter } from './common/filters/database-entity-error.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
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

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('HealthPal API')
    .setDescription('Demo API for RN showcase')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  app.useStaticAssets(join(__dirname, '..', 'Uploads'), {
    prefix: '/uploads/',
  });

  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch(error => {
  console.error(error);
  process.exit(1);
});
