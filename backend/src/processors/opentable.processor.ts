import { Processor, WorkerHost } from '@nestjs/bullmq';

import { Job } from 'bullmq';

import { Platform } from '../common/contracts';

import { QueueName, ScrapeJobData } from '../queue/queue.constants';

import { ScrapingOperationsService } from '../operations/operations.service';

@Processor(QueueName[Platform.OPENTABLE], {
  concurrency: Number(process.env.OPENTABLE_CONCURRENCY ?? 2),

  limiter: {
    max: Number(process.env.OPENTABLE_REQUESTS_PER_MINUTE ?? 20),

    duration: 60_000,
  },
})
export class OpenTableProcessor extends WorkerHost {
  constructor(private readonly operationsService: ScrapingOperationsService) {
    super();
  }

  async process(job: Job<ScrapeJobData>): Promise<void> {
    await this.operationsService.processTask(
      job.data.taskId,
      Platform.OPENTABLE,
      job,
    );
  }
}
