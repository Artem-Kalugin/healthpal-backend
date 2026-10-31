import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { NestExpressApplication } from '@nestjs/platform-express';
import { configureApp } from './app.setup';
import { ERROR_RESPONSE_MODELS } from './common/errors/dto/error-response.dto';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);
  configureApp(app);
  app.enableShutdownHooks();
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
        description: 'Enter the JWT token',
        in: 'header',
      },
      'JWT',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: ERROR_RESPONSE_MODELS,
  });

  SwaggerModule.setup('api', app, document, {
    ui: false,
    jsonDocumentUrl: 'api-json',
  });
  app.use(
    '/api',
    apiReference({
      content: document,
      cdn: 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.76.2',
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch(error => {
  console.error(error);
  process.exit(1);
});
