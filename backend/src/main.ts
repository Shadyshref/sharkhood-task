import { ValidationPipe } from '@nestjs/common';

import { NestFactory } from '@nestjs/core';

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';

import { ApiExceptionFilter, RequestIdMiddleware } from './common/http';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  const requestIdMiddleware = new RequestIdMiddleware();

  app.use(requestIdMiddleware.use.bind(requestIdMiddleware));

  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',

    methods: ['GET', 'POST'],

    allowedHeaders: ['Content-Type', 'Idempotency-Key', 'X-Request-Id'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new ApiExceptionFilter());

  if (process.env.SWAGGER_ENABLED !== 'false') {
    const config = new DocumentBuilder()
      .setTitle('Restaurant Scraping Platform API')

      .setDescription(
        'Asynchronous TripAdvisor and OpenTable restaurant scraping API.',
      )

      .setVersion('1.0.0')
      .build();

    SwaggerModule.setup(
      'api/docs',
      app,

      SwaggerModule.createDocument(app, config),
    );
  }

  await app.listen(Number(process.env.PORT ?? 3001));
}

void bootstrap();
