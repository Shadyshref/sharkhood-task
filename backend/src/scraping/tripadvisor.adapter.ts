import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';

import {
  ErrorCode,
  Platform,
  RawRestaurant,
  ScrapingError,
} from '../common/contracts';

import {
  FetchClient,
  RobotsPolicyService,
  ScraperAdapter,
} from './scraping-core.service';

@Injectable()
export class TripadvisorAdapter implements ScraperAdapter {
  readonly platform = Platform.TRIPADVISOR;
  readonly version = '1.0.0';

  constructor(
    private readonly policy: RobotsPolicyService,
    private readonly fetchClient: FetchClient,
  ) {}

  supports(url: URL): boolean {
    return url.hostname.includes('tripadvisor');
  }

  canonicalize(url: URL) {
    const match = url.pathname.match(/-d(\d+)-/i);

    if (!match) {
      throw new ScrapingError(
        ErrorCode.INVALID_URL,
        false,
        'TripAdvisor restaurant ID is missing.',
      );
    }

    url.search = '';
    url.hash = '';

    return {
      canonicalUrl: url.toString(),
      externalId: `d${match[1]}`,
    };
  }

  async scrape(url: string, externalId: string): Promise<RawRestaurant> {
    await this.policy.ensureAllowed(url);

    const html = await this.fetchClient.getHtml(url);

    const $ = cheerio.load(html);

    const name = $('h1').first().text().trim();

    if (!name) {
      throw new ScrapingError(
        ErrorCode.PARSING_FAILED,
        false,
        'Restaurant name was not found.',
      );
    }

    return {
      source: {
        platform: this.platform,
        externalId,
        canonicalUrl: url,
        adapterVersion: this.version,
      },

      name,

      cuisines: [],
      imageUrls: [],
      openingHours: [],
      menuSections: [],
      features: [],

      complete: true,
    };
  }
}
