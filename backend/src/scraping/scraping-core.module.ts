import { Module } from '@nestjs/common';

import { OpenTableAdapter } from './opentable.adapter';

import { OpenStreetMapAdapter } from './openstreetmap.adapter';

import {
  FetchClient,
  RestaurantNormalizer,
  RobotsPolicyService,
  ScraperRegistry,
} from './scraping-core.service';

import { TripadvisorAdapter } from './tripadvisor.adapter';

@Module({
  providers: [
    FetchClient,

    RobotsPolicyService,

    RestaurantNormalizer,

    TripadvisorAdapter,

    OpenTableAdapter,

    OpenStreetMapAdapter,

    {
      provide: ScraperRegistry,

      useFactory: (
        tripadvisorAdapter: TripadvisorAdapter,
        openTableAdapter: OpenTableAdapter,
        openStreetMapAdapter: OpenStreetMapAdapter,
      ) =>
        new ScraperRegistry([
          tripadvisorAdapter,
          openTableAdapter,
          openStreetMapAdapter,
        ]),

      inject: [TripadvisorAdapter, OpenTableAdapter, OpenStreetMapAdapter],
    },
  ],

  exports: [ScraperRegistry, RestaurantNormalizer],
})
export class ScrapingCoreModule {}
