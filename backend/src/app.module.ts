import { Module } from '@nestjs/common';

import { ConfigModule, ConfigService } from '@nestjs/config';

import { MongooseModule } from '@nestjs/mongoose';

import { LoggerModule } from 'nestjs-pino';

import { validateEnv } from './config/env.validation';

import { HealthModule } from './health/health.module';

import { ScrapingOperationsModule } from './operations/operations.module';

import { RestaurantsModule } from './restaurants/restaurants.module';

import { ScrapingCoreModule } from './scraping/scraping-core.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),

    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',

        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],

      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),

    ScrapingCoreModule,

    RestaurantsModule,

    ScrapingOperationsModule,

    HealthModule,
  ],
})
export class AppModule {}
