import { Injectable } from '@nestjs/common';

import {
  ErrorCode,
  Platform,
  RawRestaurant,
  ScrapingError,
} from '../common/contracts';

import { FetchClient, ScraperAdapter } from './scraping-core.service';

type OsmObjectType = 'node' | 'way' | 'relation';

interface OsmObjectReference {
  type: OsmObjectType;
  id: string;
}

interface OsmNode {
  type: 'node';
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
}

interface OsmNodeResponse {
  elements?: OsmNode[];
}

@Injectable()
export class OpenStreetMapAdapter implements ScraperAdapter {
  readonly platform = Platform.OPENSTREETMAP;
  readonly version = '1.0.0';

  constructor(private readonly fetchClient: FetchClient) {}

  supports(url: URL): boolean {
    return this.parseObjectReference(url)?.type === 'node';
  }

  canonicalize(url: URL) {
    const object = this.parseObjectReference(url);

    if (!object || object.type !== 'node') {
      throw new ScrapingError(
        ErrorCode.INVALID_URL,
        false,
        'OpenStreetMap node ID is missing.',
      );
    }

    return {
      canonicalUrl: `https://www.openstreetmap.org/${object.type}/${object.id}`,
      externalId: `${object.type}:${object.id}`,
    };
  }

  async scrape(url: string, externalId: string): Promise<RawRestaurant> {
    const object = this.parseObjectReference(new URL(url));

    if (!object || object.type !== 'node') {
      throw new ScrapingError(
        ErrorCode.INVALID_URL,
        false,
        'OpenStreetMap node ID is missing.',
      );
    }

    const response = await this.fetchClient.getJson<OsmNodeResponse>(
      `https://api.openstreetmap.org/api/0.6/${object.type}/${object.id}.json`,
    );
    const node = response.elements?.find((element) => element.type === 'node');
    const tags = node?.tags ?? {};
    const name = tags.name;

    if (!node || !name) {
      throw new ScrapingError(
        ErrorCode.PARSING_FAILED,
        false,
        'OpenStreetMap node does not contain a restaurant name.',
      );
    }

    const openingHours = tags.opening_hours;

    return {
      source: {
        platform: this.platform,
        externalId,
        canonicalUrl: `https://www.openstreetmap.org/${object.type}/${object.id}`,
        adapterVersion: this.version,
      },
      name,
      address: this.address(tags),
      latitude: this.numberAttribute(node.lat),
      longitude: this.numberAttribute(node.lon),
      cuisines: this.cuisines(tags.cuisine),
      openingHours: openingHours
        ? [
            {
              day: 'OSM',
              opens: openingHours,
              closes: '',
            },
          ]
        : [],
      phone: tags.phone ?? tags['contact:phone'],
      website: tags.website ?? tags['contact:website'],
      imageUrls: [],
      menuSections: [],
      features: [],
      complete: true,
    };
  }

  private parseObjectReference(url: URL): OsmObjectReference | undefined {
    if (url.hostname !== 'www.openstreetmap.org') {
      return undefined;
    }

    const match = url.pathname.match(/^\/(node|way|relation)\/(\d+)\/?$/);

    if (!match) {
      return undefined;
    }

    return {
      type: match[1] as OsmObjectType,
      id: match[2],
    };
  }

  private address(tags: Record<string, string>) {
    if (tags['addr:full']) {
      return tags['addr:full'];
    }

    const streetAddress = [tags['addr:housenumber'], tags['addr:street']]
      .filter(Boolean)
      .join(' ');

    const locality = [
      tags['addr:postcode'],
      tags['addr:city'],
      tags['addr:state'],
      tags['addr:country'],
    ]
      .filter(Boolean)
      .join(', ');

    return [streetAddress, locality].filter(Boolean).join(', ') || undefined;
  }

  private cuisines(value?: string) {
    return value
      ? value
          .split(';')
          .map((cuisine) => cuisine.trim())
          .filter(Boolean)
      : [];
  }

  private numberAttribute(value: number | undefined) {
    return value !== undefined && Number.isFinite(value) ? value : undefined;
  }
}
