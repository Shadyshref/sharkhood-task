import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Job } from 'bullmq';

import { Model, Types } from 'mongoose';

import {
  ErrorCode,
  Platform,
  ScrapingError,
  ScrapingOperationStatus,
  ScrapingTaskStatus,
} from '../common/contracts';

import { QueuePublisherService } from '../queue/queue-publisher.service';

import { ScrapeJobData } from '../queue/queue.constants';

import { RestaurantsService } from '../restaurants/restaurants.service';

import {
  Restaurant,
  RestaurantDocument,
  ScrapingOperation,
  ScrapingOperationDocument,
  ScrapingTask,
  ScrapingTaskDocument,
} from '../schema/schemas';

import {
  RestaurantNormalizer,
  ScraperRegistry,
} from '../scraping/scraping-core.service';

import { OperationQueryDto } from './dto/operation-query.dto';

import { SubmitScrapingOperationDto } from './dto/submit-scraping-operation.dto';

@Injectable()
export class ScrapingOperationsService {
  private readonly logger = new Logger(ScrapingOperationsService.name);

  constructor(
    @InjectModel(ScrapingOperation.name)
    private readonly operationModel: Model<ScrapingOperationDocument>,

    @InjectModel(ScrapingTask.name)
    private readonly taskModel: Model<ScrapingTaskDocument>,

    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,

    private readonly scraperRegistry: ScraperRegistry,

    private readonly restaurantNormalizer: RestaurantNormalizer,

    private readonly restaurantsService: RestaurantsService,

    private readonly queuePublisher: QueuePublisherService,
  ) {}

  async submit(dto: SubmitScrapingOperationDto) {
    const accepted: Array<{
      originalUrl: string;
      canonicalUrl: string;
      platform: Platform;
    }> = [];

    const rejected: Array<{
      url: string;
      code: ErrorCode;
      message: string;
    }> = [];

    const duplicates: string[] = [];

    const seenCanonicalUrls = new Set<string>();

    for (const originalUrl of dto.urls) {
      try {
        const resolved = this.scraperRegistry.resolve(originalUrl);

        if (seenCanonicalUrls.has(resolved.canonicalUrl)) {
          duplicates.push(originalUrl);

          continue;
        }

        seenCanonicalUrls.add(resolved.canonicalUrl);

        accepted.push({
          originalUrl,

          canonicalUrl: resolved.canonicalUrl,

          platform: resolved.adapter.platform,
        });
      } catch (error) {
        const scrapingError =
          error instanceof ScrapingError
            ? error
            : new ScrapingError(
                ErrorCode.INVALID_URL,
                false,
                'URL is invalid.',
              );

        rejected.push({
          url: originalUrl,
          code: scrapingError.code,
          message: scrapingError.message,
        });
      }
    }

    if (accepted.length === 0) {
      throw new UnprocessableEntityException({
        code: ErrorCode.UNSUPPORTED_PLATFORM,

        message: 'No submitted URLs belong to supported platforms.',

        details: rejected,
      });
    }

    const operation = await this.operationModel.create({
      requestedCount: dto.urls.length,

      acceptedCount: accepted.length,

      rejectedCount: rejected.length,

      status: ScrapingOperationStatus.QUEUING,
    });

    const tasks = await this.taskModel.insertMany(
      accepted.map((item) => ({
        operationId: operation._id,

        originalUrl: item.originalUrl,

        canonicalUrl: item.canonicalUrl,

        platform: item.platform,

        status: ScrapingTaskStatus.PENDING,
      })),
    );

    try {
      await this.queuePublisher.publishPendingTaskIds(
        tasks.map((task) => task._id),
      );
    } catch {
      this.logger.warn(
        `Queue publication failed for operation ${operation.operationId}. Pending-task recovery will retry publication.`,
      );
    }

    return {
      operationId: operation.operationId,

      status: operation.status,

      requestedCount: operation.requestedCount,

      acceptedCount: operation.acceptedCount,

      rejected,

      duplicates,
    };
  }

  async getOperation(operationId: string, query: OperationQueryDto) {
    const operation = await this.operationModel
      .findOne({
        operationId,
      })
      .lean();

    if (!operation) {
      throw new NotFoundException({
        code: ErrorCode.OPERATION_NOT_FOUND,

        message: 'Scraping operation was not found.',
      });
    }

    const taskFilter: Record<string, unknown> = {
      operationId: operation._id,
    };

    if (query.cursor) {
      taskFilter._id = {
        $gt: new Types.ObjectId(query.cursor),
      };
    }

    const tasks = await this.taskModel
      .find(taskFilter)
      .sort({
        _id: 1,
      })
      .limit(101)
      .lean();

    const page = tasks.slice(0, 100);

    const counts = await this.taskModel.aggregate<{
      _id: ScrapingTaskStatus;
      count: number;
    }>([
      {
        $match: {
          operationId: operation._id,
        },
      },

      {
        $group: {
          _id: '$status',

          count: {
            $sum: 1,
          },
        },
      },
    ]);

    return {
      ...operation,

      counts: Object.fromEntries(counts.map((item) => [item._id, item.count])),

      tasks: page,

      nextCursor: tasks.length > 100 ? page.at(-1)?._id.toString() : undefined,
    };
  }

  async getResults(operationId: string) {
    const operation = await this.operationModel
      .findOne({
        operationId,
      })
      .lean();

    if (!operation) {
      throw new NotFoundException({
        code: ErrorCode.OPERATION_NOT_FOUND,

        message: 'Scraping operation was not found.',
      });
    }

    const successfulTasks = await this.taskModel
      .find({
        operationId: operation._id,

        status: ScrapingTaskStatus.SUCCEEDED,

        restaurantId: {
          $exists: true,
        },
      })
      .select({
        restaurantId: 1,
      })
      .lean();

    const restaurantIds = successfulTasks.flatMap((task) =>
      task.restaurantId ? [task.restaurantId] : [],
    );

    const restaurants = await this.restaurantModel
      .find({
        _id: {
          $in: restaurantIds,
        },
      })
      .lean();

    return {
      operationId: operation.operationId,

      status: operation.status,

      data: restaurants,
    };
  }

  async processTask(
    taskId: string,
    expectedPlatform: Platform,
    job: Job<ScrapeJobData>,
  ): Promise<void> {
    const task = await this.taskModel.findOneAndUpdate(
      {
        _id: taskId,

        platform: expectedPlatform,

        status: {
          $in: [
            ScrapingTaskStatus.PENDING,
            ScrapingTaskStatus.QUEUED,
            ScrapingTaskStatus.PROCESSING,
          ],
        },
      },

      {
        $set: {
          status: ScrapingTaskStatus.PROCESSING,

          startedAt: new Date(),

          attempts: job.attemptsMade + 1,
        },
      },

      {
        new: true,
      },
    );

    if (!task) {
      return;
    }

    try {
      const resolved = this.scraperRegistry.resolve(task.canonicalUrl);

      if (resolved.adapter.platform !== expectedPlatform) {
        throw new ScrapingError(
          ErrorCode.INTERNAL_ERROR,
          false,
          'Task was delivered to an incorrect platform queue.',
        );
      }

      const rawRestaurant = await resolved.adapter.scrape(
        task.canonicalUrl,
        resolved.externalId,
      );

      const normalizedRestaurant =
        this.restaurantNormalizer.normalize(rawRestaurant);

      const restaurant =
        await this.restaurantsService.upsert(normalizedRestaurant);

      await this.taskModel.updateOne(
        {
          _id: task._id,
        },

        {
          $set: {
            status: ScrapingTaskStatus.SUCCEEDED,

            restaurantId: restaurant._id,

            completedAt: new Date(),
          },

          $unset: {
            error: 1,
          },
        },
      );

      await this.refreshOperationStatus(task.operationId);
    } catch (error) {
      const scrapingError =
        error instanceof ScrapingError
          ? error
          : new ScrapingError(
              ErrorCode.INTERNAL_ERROR,
              false,
              'Scraping task failed unexpectedly.',
            );

      const maximumAttempts = job.opts.attempts ?? 1;

      const willRetry =
        scrapingError.retryable && job.attemptsMade + 1 < maximumAttempts;

      if (willRetry) {
        await this.taskModel.updateOne(
          {
            _id: task._id,
          },

          {
            $set: {
              status: ScrapingTaskStatus.QUEUED,

              attempts: job.attemptsMade + 1,

              error: scrapingError.toTaskError(),
            },
          },
        );

        await this.refreshOperationStatus(task.operationId);

        throw scrapingError;
      }

      await this.taskModel.updateOne(
        {
          _id: task._id,
        },

        {
          $set: {
            status: ScrapingTaskStatus.FAILED,

            attempts: job.attemptsMade + 1,

            error: scrapingError.toTaskError(),

            completedAt: new Date(),
          },
        },
      );

      await this.refreshOperationStatus(task.operationId);
    }
  }

  private async refreshOperationStatus(operationId: Types.ObjectId) {
    const counts = await this.taskModel.aggregate<{
      _id: ScrapingTaskStatus;
      count: number;
    }>([
      {
        $match: {
          operationId,
        },
      },

      {
        $group: {
          _id: '$status',

          count: {
            $sum: 1,
          },
        },
      },
    ]);

    const countByStatus = Object.fromEntries(
      counts.map((item) => [item._id, item.count]),
    ) as Partial<Record<ScrapingTaskStatus, number>>;

    const activeCount =
      (countByStatus[ScrapingTaskStatus.PENDING] ?? 0) +
      (countByStatus[ScrapingTaskStatus.QUEUED] ?? 0) +
      (countByStatus[ScrapingTaskStatus.PROCESSING] ?? 0);

    if (activeCount > 0) {
      await this.operationModel.updateOne(
        {
          _id: operationId,
        },

        {
          $set: {
            status: ScrapingOperationStatus.PROCESSING,
          },

          $min: {
            startedAt: new Date(),
          },
        },
      );

      return;
    }

    const succeededCount = countByStatus[ScrapingTaskStatus.SUCCEEDED] ?? 0;

    const failedCount = countByStatus[ScrapingTaskStatus.FAILED] ?? 0;

    const status =
      succeededCount > 0 && failedCount > 0
        ? ScrapingOperationStatus.PARTIALLY_SUCCEEDED
        : succeededCount > 0
          ? ScrapingOperationStatus.SUCCEEDED
          : ScrapingOperationStatus.FAILED;

    await this.operationModel.updateOne(
      {
        _id: operationId,
      },

      {
        $set: {
          status,

          completedAt: new Date(),
        },
      },
    );
  }
}
