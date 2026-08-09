import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import {
  Restaurant,
  RestaurantSchema,
  ScrapingOperation,
  ScrapingOperationSchema,
  ScrapingTask,
  ScrapingTaskSchema,
} from '../schema/schemas';

import { QueueModule } from '../queue/queue.module';

import { RestaurantsModule } from '../restaurants/restaurants.module';

import { ScrapingCoreModule } from '../scraping/scraping-core.module';

import { OperationsController } from './operations.controller';

import { ScrapingOperationsService } from './operations.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ScrapingOperation.name,

        schema: ScrapingOperationSchema,
      },

      {
        name: ScrapingTask.name,

        schema: ScrapingTaskSchema,
      },

      {
        name: Restaurant.name,

        schema: RestaurantSchema,
      },
    ]),

    QueueModule,

    RestaurantsModule,

    ScrapingCoreModule,
  ],

  controllers: [OperationsController],

  providers: [ScrapingOperationsService],

  exports: [ScrapingOperationsService],
})
export class ScrapingOperationsModule {}
