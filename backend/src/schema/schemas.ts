import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

import {
  ErrorCode,
  Platform,
  ScrapingOperationStatus,
  ScrapingTaskStatus,
} from '../common/contracts';

import { randomUUID } from 'node:crypto';

@Schema({
  timestamps: true,
  collection: 'restaurants',
})
export class Restaurant {
  @Prop({
    required: true,
    enum: Platform,
  })
  platform!: Platform;

  @Prop({ required: true })
  externalId!: string;

  @Prop({ required: true })
  canonicalUrl!: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  address?: string;

  @Prop({ type: Object })
  location?: {
    latitude: number;
    longitude: number;
  };

  @Prop({
    type: [String],
    default: [],
  })
  cuisines!: string[];

  @Prop({ type: Object })
  rating?: {
    value: number;
    max: number;
    reviewCount?: number;
  };

  @Prop()
  priceRange?: string;

  @Prop({
    type: [Object],
    default: [],
  })
  openingHours!: Array<{
    day: string;
    opens: string;
    closes: string;
  }>;

  @Prop({ type: Object })
  contact?: {
    phone?: string;
    website?: string;
  };

  @Prop({
    type: [String],
    default: [],
  })
  imageUrls!: string[];

  @Prop({
    type: [Object],
    default: [],
  })
  menuSections!: Array<{
    name: string;
    items: Array<{
      name: string;
      description?: string;
      price?: string;
    }>;
  }>;

  @Prop()
  description?: string;

  @Prop({
    type: [String],
    default: [],
  })
  features!: string[];

  @Prop({ required: true })
  adapterVersion!: string;

  @Prop({ required: true })
  lastScrapedAt!: Date;

  @Prop()
  contentHash?: string;

  @Prop({
    default: false,
  })
  lastScrapeComplete!: boolean;
}

export type RestaurantDocument = HydratedDocument<Restaurant>;

export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);

RestaurantSchema.index(
  {
    platform: 1,
    externalId: 1,
  },
  {
    unique: true,
  },
);

RestaurantSchema.index({
  canonicalUrl: 1,
});

RestaurantSchema.index({
  lastScrapedAt: -1,
});

//////////////////////
@Schema({
  timestamps: true,
  collection: 'scraping_operations',
})
export class ScrapingOperation {
  @Prop({
    required: true,

    default: randomUUID,
  })
  operationId!: string;

  @Prop({
    required: true,
    enum: ScrapingOperationStatus,
    default: ScrapingOperationStatus.QUEUING,
  })
  status!: ScrapingOperationStatus;

  @Prop({ required: true })
  requestedCount!: number;

  @Prop({ required: true })
  acceptedCount!: number;

  @Prop({
    required: true,
    default: 0,
  })
  rejectedCount!: number;

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;
}

export type ScrapingOperationDocument = HydratedDocument<ScrapingOperation>;

export const ScrapingOperationSchema =
  SchemaFactory.createForClass(ScrapingOperation);

ScrapingOperationSchema.index(
  {
    operationId: 1,
  },
  {
    unique: true,
  },
);

ScrapingOperationSchema.index({
  status: 1,
  createdAt: -1,
});

//////////////////////

@Schema({
  timestamps: true,
  collection: 'scraping_tasks',
})
export class ScrapingTask {
  @Prop({
    required: true,
    type: MongooseSchema.Types.ObjectId,
    ref: ScrapingOperation.name,
  })
  operationId!: Types.ObjectId;

  @Prop({ required: true })
  originalUrl!: string;

  @Prop({ required: true })
  canonicalUrl!: string;

  @Prop({
    required: true,
    enum: Platform,
  })
  platform!: Platform;

  @Prop({
    required: true,
    enum: ScrapingTaskStatus,
    default: ScrapingTaskStatus.PENDING,
  })
  status!: ScrapingTaskStatus;

  @Prop({ default: 0 })
  attempts!: number;

  @Prop({ type: Object })
  error?: {
    code: ErrorCode;
    message: string;
    retryable: boolean;
    upstreamStatus?: number;
  };

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Restaurant.name,
  })
  restaurantId?: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: ScrapingTask.name,
  })
  leaderTaskId?: Types.ObjectId;

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;
}

export type ScrapingTaskDocument = HydratedDocument<ScrapingTask>;

export const ScrapingTaskSchema = SchemaFactory.createForClass(ScrapingTask);

ScrapingTaskSchema.index(
  {
    operationId: 1,
    canonicalUrl: 1,
  },
  {
    unique: true,
  },
);

ScrapingTaskSchema.index({
  operationId: 1,
  status: 1,
  createdAt: -1,
});

ScrapingTaskSchema.index({
  canonicalUrl: 1,
  status: 1,
});

//////////////////////

@Schema({
  timestamps: true,
  collection: 'idempotency_records',
})
export class IdempotencyRecord {
  @Prop({
    required: true,
  })
  keyHash!: string;

  @Prop({ required: true })
  requestHash!: string;

  @Prop({
    required: true,
    type: MongooseSchema.Types.ObjectId,
    ref: ScrapingOperation.name,
  })
  operationId!: Types.ObjectId;

  @Prop({ required: true })
  expiresAt!: Date;
}

export type IdempotencyRecordDocument = HydratedDocument<IdempotencyRecord>;

export const IdempotencyRecordSchema =
  SchemaFactory.createForClass(IdempotencyRecord);

IdempotencyRecordSchema.index(
  {
    keyHash: 1,
  },
  {
    unique: true,
  },
);

IdempotencyRecordSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  },
);
