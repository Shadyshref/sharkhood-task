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
export class OpenTableAdapter implements ScraperAdapter {
  readonly platform = Platform.OPENTABLE;
  readonly version = '1.0.0';

  constructor(
    private readonly policy: RobotsPolicyService,
    private readonly fetchClient: FetchClient,
  ) {}

  supports(url: URL): boolean {
    return (
      url.hostname.includes('opentable.com') && url.pathname.startsWith('/r/')
    );
  }

  canonicalize(url: URL) {
    const parts = url.pathname.split('/');

    const slug = parts[2];

    if (!slug) {
      throw new ScrapingError(
        ErrorCode.INVALID_URL,
        false,
        'OpenTable restaurant slug is missing.',
      );
    }

    url.pathname = `/r/${slug}`;
    url.search = '';
    url.hash = '';

    return {
      canonicalUrl: url.toString(),
      externalId: slug.toLowerCase(),
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
        'OpenTable restaurant name was not found.',
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
