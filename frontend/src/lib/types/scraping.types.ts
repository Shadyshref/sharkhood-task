export type OperationStatus =
  | "QUEUING"
  | "QUEUED"
  | "PROCESSING"
  | "SUCCEEDED"
  | "PARTIALLY_SUCCEEDED"
  | "FAILED";

export type TaskStatus =
  | "PENDING"
  | "QUEUED"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "DEDUPLICATED";

export type Platform = "TRIPADVISOR" | "OPENTABLE" | "OPENSTREETMAP";

export interface RejectedUrl {
  url: string;
  code: string;
  message: string;
}

export interface CreateOperationResponse {
  operationId: string;
  status: OperationStatus;
  requestedCount: number;
  acceptedCount: number;
  rejected?: RejectedUrl[];
  duplicates?: string[];
}

export interface ScrapingTaskError {
  code: string;
  message: string;
  retryable?: boolean;
  upstreamStatus?: number;
}

export interface ScrapingTask {
  _id: string;
  originalUrl: string;
  canonicalUrl?: string;
  platform: Platform;
  status: TaskStatus;
  attempts: number;
  error?: ScrapingTaskError;
}

export interface ScrapingOperation {
  _id?: string;
  operationId: string;
  status: OperationStatus;
  requestedCount: number;
  acceptedCount: number;
  rejectedCount?: number;
  counts?: Record<string, number>;
  tasks?: ScrapingTask[];
  nextCursor?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OpeningHour {
  day: string;
  opens: string;
  closes: string;
}

export interface Restaurant {
  _id: string;
  imageUrls?: string[];
  externalId?: string;
  platform?: Platform;
  canonicalUrl?: string;
  name?: string;
  cuisines?: string[];
  features?: string[];
  openingHours?: OpeningHour[];
  adapterVersion?: string;
  lastScrapedAt?: string;
  lastScrapeComplete?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScrapingResultsResponse {
  operationId: string;
  status: OperationStatus;
  data: Restaurant[];
}
