export enum Platform {
  TRIPADVISOR = 'TRIPADVISOR',
  OPENTABLE = 'OPENTABLE',
  OPENSTREETMAP = 'OPENSTREETMAP',
}

export enum ScrapingTaskStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  DEDUPLICATED = 'DEDUPLICATED',
}

export enum ScrapingOperationStatus {
  QUEUING = 'QUEUING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  PARTIALLY_SUCCEEDED = 'PARTIALLY_SUCCEEDED',
  FAILED = 'FAILED',
}

export enum ErrorCode {
  INVALID_URL = 'INVALID_URL',
  UNSUPPORTED_PLATFORM = 'UNSUPPORTED_PLATFORM',
  IDEMPOTENCY_CONFLICT = 'IDEMPOTENCY_CONFLICT',
  OPERATION_NOT_FOUND = 'OPERATION_NOT_FOUND',
  RESTAURANT_NOT_FOUND = 'RESTAURANT_NOT_FOUND',

  DISALLOWED_BY_POLICY = 'DISALLOWED_BY_POLICY',
  SOURCE_NOT_FOUND = 'SOURCE_NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  BOT_PROTECTION = 'BOT_PROTECTION',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  UPSTREAM_ERROR = 'UPSTREAM_ERROR',
  PARSING_FAILED = 'PARSING_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface ApiErrorResponse {
  statusCode: number;
  code: ErrorCode;
  message: string;
  requestId: string;
  details?: unknown;
}

export interface TaskError {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  upstreamStatus?: number;
}

export interface SourceMetadata {
  platform: Platform;
  externalId: string;
  canonicalUrl: string;
  adapterVersion: string;
  scrapedAt: Date;
  contentHash?: string;
}

export interface OpeningHour {
  day: string;
  opens: string;
  closes: string;
}

export interface MenuItem {
  name: string;
  description?: string;
  price?: string;
}

export interface MenuSection {
  name: string;
  items: MenuItem[];
}

export interface RawRestaurant {
  source: Omit<SourceMetadata, 'scrapedAt' | 'contentHash'>;

  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  cuisines?: string[];
  ratingValue?: number;
  ratingMax?: number;
  reviewCount?: number;
  priceRange?: string;
  openingHours?: OpeningHour[];
  phone?: string;
  website?: string;
  imageUrls?: string[];
  menuSections?: MenuSection[];
  description?: string;
  features?: string[];
  complete: boolean;
}

export interface NormalizedRestaurant {
  source: SourceMetadata;
  name: string;
  address?: string;

  location?: {
    latitude: number;
    longitude: number;
  };

  cuisines: string[];

  rating?: {
    value: number;
    max: number;
    reviewCount?: number;
  };

  priceRange?: string;

  openingHours: OpeningHour[];

  contact?: {
    phone?: string;
    website?: string;
  };

  imageUrls: string[];
  menuSections: MenuSection[];
  description?: string;
  features: string[];
  complete: boolean;
}

export class ScrapingError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly retryable: boolean,
    message: string,
    public readonly upstreamStatus?: number,
  ) {
    super(message);
    this.name = 'ScrapingError';
  }

  toTaskError(): TaskError {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      upstreamStatus: this.upstreamStatus,
    };
  }
}
