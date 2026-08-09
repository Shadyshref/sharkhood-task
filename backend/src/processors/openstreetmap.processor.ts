import { Processor, WorkerHost } from '@nestjs/bullmq';

import { Job } from 'bullmq';

import { Platform } from '../common/contracts';

import { ScrapingOperationsService } from '../operations/operations.service';

import { QueueName, ScrapeJobData } from '../queue/queue.constants';

@Processor(QueueName[Platform.OPENSTREETMAP], {
  concurrency: Number(process.env.OPENSTREETMAP_CONCURRENCY ?? 1),

  limiter: {
    max: Number(process.env.OPENSTREETMAP_REQUESTS_PER_MINUTE ?? 10),

    duration: 60_000,
  },
})
export class OpenStreetMapProcessor extends WorkerHost {
  constructor(private readonly operationsService: ScrapingOperationsService) {
    super();
  }

  async process(job: Job<ScrapeJobData>): Promise<void> {
    await this.operationsService.processTask(
      job.data.taskId,
      Platform.OPENSTREETMAP,
      job,
    );
  }
}
