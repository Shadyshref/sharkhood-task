import { Module } from '@nestjs/common';

import { ScrapingOperationsModule } from './operations.module';

import { OpenTableProcessor } from '../processors/opentable.processor';

import { OpenStreetMapProcessor } from '../processors/openstreetmap.processor';

import { TripadvisorProcessor } from '../processors/tripadvisor.processor';

@Module({
  imports: [ScrapingOperationsModule],

  providers: [TripadvisorProcessor, OpenTableProcessor, OpenStreetMapProcessor],
})
export class OperationsWorkerModule {}
