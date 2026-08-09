import { Module } from '@nestjs/common';

import { BullModule } from '@nestjs/bullmq';

import { ConfigService } from '@nestjs/config';

import { ScheduleModule } from '@nestjs/schedule';

import { MongooseModule } from '@nestjs/mongoose';

import { Platform } from '../common/contracts';

import { ScrapingTask, ScrapingTaskSchema } from '../schema/schemas';

import { QueueName } from './queue.constants';

import { QueuePublisherService } from './queue-publisher.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),

    MongooseModule.forFeature([
      {
        name: ScrapingTask.name,
        schema: ScrapingTaskSchema,
      },
    ]),

    BullModule.forRootAsync({
      inject: [ConfigService],

      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.getOrThrow<string>('REDIS_URL'),
        },
      }),
    }),

    BullModule.registerQueue(
      {
        name: QueueName[Platform.TRIPADVISOR],
      },

      {
        name: QueueName[Platform.OPENTABLE],
      },

      {
        name: QueueName[Platform.OPENSTREETMAP],
      },
    ),
  ],

  providers: [QueuePublisherService],

  exports: [QueuePublisherService],
})
export class QueueModule {}
