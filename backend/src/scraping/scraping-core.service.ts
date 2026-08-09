import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { Agent, interceptors, request } from 'undici';
import robotsParser from 'robots-parser';
import * as cheerio from 'cheerio';

import {
  ErrorCode,
  NormalizedRestaurant,
  Platform,
  RawRestaurant,
  ScrapingError,
} from '../common/contracts';

export interface ScraperAdapter {
  readonly platform: Platform;
  readonly version: string;

  supports(url: URL): boolean;

  canonicalize(url: URL): {
    canonicalUrl: string;
    externalId: string;
  };

  scrape(url: string, externalId: string): Promise<RawRestaurant>;
}

@Injectable()
export class ScraperRegistry {
  constructor(private readonly adapters: ScraperAdapter[]) {}

  resolve(input: string) {
    let url: URL;

    try {
      url = new URL(input);
    } catch {
      throw new ScrapingError(ErrorCode.INVALID_URL, false, 'URL is invalid.');
    }

    if (url.protocol !== 'https:') {
      throw new ScrapingError(
        ErrorCode.INVALID_URL,
        false,
        'Only HTTPS URLs are accepted.',
      );
    }

    const adapter = this.adapters.find((item) => item.supports(url));

    if (!adapter) {
      throw new ScrapingError(
        ErrorCode.UNSUPPORTED_PLATFORM,
        false,
        'The URL does not belong to a supported restaurant platform.',
      );
    }

    const identity = adapter.canonicalize(url);

    return {
      adapter,
      ...identity,
    };
  }
}

@Injectable()
export class RobotsPolicyService {
  private readonly cache = new Map<
    string,
    {
      expiresAt: number;
      parser: ReturnType<typeof robotsParser>;
    }
  >();

  async ensureAllowed(targetUrl: string) {
    const url = new URL(targetUrl);

    const robotsUrl = `${url.origin}/robots.txt`;

    const cached = this.cache.get(url.origin);

    let parser = cached?.parser;

    if (!cached || cached.expiresAt < Date.now()) {
      try {
        const response = await request(robotsUrl, {
          method: 'GET',
          headersTimeout: 5000,
          bodyTimeout: 5000,
        });

        const text = await response.body.text();

        parser = robotsParser(robotsUrl, text);

        this.cache.set(url.origin, {
          parser,
          expiresAt: Date.now() + 60 * 60 * 1000,
        });
      } catch {
        throw new ScrapingError(
          ErrorCode.DISALLOWED_BY_POLICY,
          false,
          'Unable to verify scraping policy for this platform.',
        );
      }
    }

    if (!parser?.isAllowed(targetUrl, 'RestaurantScrapingPlatform')) {
      throw new ScrapingError(
        ErrorCode.DISALLOWED_BY_POLICY,
        false,
        'This URL is disallowed by the target platform policy.',
      );
    }
  }
}

@Injectable()
export class FetchClient {
  private readonly dispatcher = new Agent().compose(
    interceptors.redirect({
      maxRedirections: 2,
    }),
  );

  constructor(private readonly config: ConfigService) {}

  async getHtml(url: string) {
    const html = await this.getText(url, {
      accept: 'text/html,application/xhtml+xml',
      sourceNotFoundStatuses: [404],
      sourceNotFoundMessage: 'Restaurant page was not found.',
    });

    if (this.looksLikeBotProtection(html)) {
      throw new ScrapingError(
        ErrorCode.BOT_PROTECTION,
        false,
        'Target platform returned a bot-protection page.',
      );
    }

    return html;
  }

  async getJson<T>(url: string): Promise<T> {
    const text = await this.getText(url, {
      accept: 'application/json',
      sourceNotFoundStatuses: [404, 410],
      sourceNotFoundMessage: 'Restaurant source was not found.',
    });

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ScrapingError(
        ErrorCode.PARSING_FAILED,
        false,
        'Target platform returned invalid JSON.',
      );
    }
  }

  private async getText(
    url: string,
    options: {
      accept: string;
      sourceNotFoundStatuses: number[];
      sourceNotFoundMessage: string;
    },
  ) {
    const timeout = this.config.getOrThrow<number>('SCRAPING_HTTP_TIMEOUT_MS');

    try {
      const response = await request(url, {
        method: 'GET',

        dispatcher: this.dispatcher,

        headersTimeout: timeout,
        bodyTimeout: timeout,

        headers: {
          'user-agent': 'RestaurantScrapingPlatform/1.0',

          accept: options.accept,
        },

        signal: AbortSignal.timeout(timeout),
      });

      const html = await response.body.text();

      if (options.sourceNotFoundStatuses.includes(response.statusCode)) {
        throw new ScrapingError(
          ErrorCode.SOURCE_NOT_FOUND,
          false,
          options.sourceNotFoundMessage,
          response.statusCode,
        );
      }

      if (
        response.statusCode === 408 ||
        response.statusCode === 429 ||
        response.statusCode >= 500
      ) {
        throw new ScrapingError(
          response.statusCode === 429
            ? ErrorCode.RATE_LIMITED
            : ErrorCode.UPSTREAM_ERROR,
          true,
          'Target platform is temporarily unavailable.',
          response.statusCode,
        );
      }

      if (response.statusCode >= 400) {
        throw new ScrapingError(
          ErrorCode.UPSTREAM_ERROR,
          false,
          'Target platform rejected the request.',
          response.statusCode,
        );
      }

      return html;
    } catch (error) {
      if (error instanceof ScrapingError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new ScrapingError(
          ErrorCode.NETWORK_TIMEOUT,
          true,
          'Scraping request timed out.',
        );
      }

      throw new ScrapingError(
        ErrorCode.UPSTREAM_ERROR,
        true,
        'Network request failed.',
      );
    }
  }

  private looksLikeBotProtection(html: string) {
    const value = html.toLowerCase();

    return [
      'captcha',
      'verify you are human',
      'unusual traffic',
      'cloudflare',
      'attention required',
    ].some((marker) => value.includes(marker));
  }
}

@Injectable()
export class RestaurantNormalizer {
  normalize(raw: RawRestaurant): NormalizedRestaurant {
    const contentHash = createHash('sha256')
      .update(JSON.stringify(raw))
      .digest('hex');

    return {
      source: {
        ...raw.source,
        scrapedAt: new Date(),
        contentHash,
      },

      name: raw.name.trim(),

      address: raw.address?.trim(),

      location:
        raw.latitude !== undefined && raw.longitude !== undefined
          ? {
              latitude: raw.latitude,
              longitude: raw.longitude,
            }
          : undefined,

      cuisines: [
        ...new Set(
          (raw.cuisines ?? []).map((item) => item.trim()).filter(Boolean),
        ),
      ],

      rating:
        raw.ratingValue !== undefined
          ? {
              value: raw.ratingValue,
              max: raw.ratingMax ?? 5,
              reviewCount: raw.reviewCount,
            }
          : undefined,

      priceRange: raw.priceRange?.trim(),

      openingHours: raw.openingHours ?? [],

      contact:
        raw.phone || raw.website
          ? {
              phone: raw.phone?.trim(),

              website: raw.website?.trim(),
            }
          : undefined,

      imageUrls: [...new Set(raw.imageUrls ?? [])],

      menuSections: raw.menuSections ?? [],

      description: raw.description?.trim(),

      features: [...new Set(raw.features ?? [])],

      complete: raw.complete,
    };
  }
}

export function parseJsonLd(html: string): Record<string, unknown> | undefined {
  const $ = cheerio.load(html);

  const nodes: Record<string, unknown>[] = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const parsed = JSON.parse($(element).text()) as unknown;

      if (Array.isArray(parsed)) {
        nodes.push(...(parsed as Record<string, unknown>[]));
      } else if (typeof parsed === 'object' && parsed) {
        const item = parsed as Record<string, unknown>;

        nodes.push(item);

        if (Array.isArray(item['@graph'])) {
          nodes.push(...(item['@graph'] as Record<string, unknown>[]));
        }
      }
    } catch {
      return;
    }
  });

  return nodes.find((node) => {
    const type = node['@type'];

    return (
      type === 'Restaurant' ||
      (Array.isArray(type) && type.includes('Restaurant'))
    );
  });
}

export function valueAsString(value: unknown) {
  return typeof value === 'string' ? value.trim() : undefined;
}
