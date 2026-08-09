import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ScrapingTask, ScrapingTaskDocument } from '../schema/schemas';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { QueueName, ScrapeJobData } from './queue.constants';
import { Platform, ScrapingTaskStatus } from '../common/contracts';
import { Cron } from '@nestjs/schedule';
@Injectable()
export class QueuePublisherService implements OnModuleInit {
  constructor(
    @InjectModel(ScrapingTask.name)
    private readonly taskModel: Model<ScrapingTaskDocument>,

    @InjectQueue(QueueName[Platform.TRIPADVISOR])
    private readonly tripadvisorQueue: Queue<ScrapeJobData>,

    @InjectQueue(QueueName[Platform.OPENTABLE])
    private readonly opentableQueue: Queue<ScrapeJobData>,

    @InjectQueue(QueueName[Platform.OPENSTREETMAP])
    private readonly openStreetMapQueue: Queue<ScrapeJobData>,
  ) {}

  async onModuleInit() {
    await this.publishPendingTasks();
  }

  @Cron('* * * * *')
  async recoverPendingTasks() {
    await this.publishPendingTasks();
  }

  async publishPendingTaskIds(tasksIds: Types.ObjectId[]) {
    const tasks = await this.taskModel.find({
      _id: {
        $in: tasksIds,
      },

      status: ScrapingTaskStatus.PENDING,
    });
    await this.publish(tasks);
  }

  private async publishPendingTasks() {
    const tasks = await this.taskModel
      .find({
        status: ScrapingTaskStatus.PENDING,
      })
      .limit(500);
    await this.publish(tasks);
  }

  private async publish(tasks: ScrapingTaskDocument[]) {
    for (const task of tasks) {
      const queue = this.getQueue(task.platform);

      const taskId = task._id.toString();

      await queue.add(
        'scrape-restaurant',
        { taskId },
        {
          jobId: taskId,
          attempts: 4,
          backoff: { type: 'exponential', delay: 60_000 },
          removeOnComplete: {
            age: 60 * 60 * 24 * 7,
          },
          removeOnFail: {
            age: 60 * 60 * 24 * 10,
          },
        },
      );
      await this.taskModel.updateOne(
        {
          _id: task._id,
          status: ScrapingTaskStatus.PENDING,
        },
        {
          $set: {
            status: ScrapingTaskStatus.QUEUED,
          },
        },
      );
    }
  }
  private getQueue(platform: Platform): Queue<ScrapeJobData> {
    switch (platform) {
      case Platform.TRIPADVISOR:
        return this.tripadvisorQueue;
      case Platform.OPENTABLE:
        return this.opentableQueue;
      case Platform.OPENSTREETMAP:
        return this.openStreetMapQueue;
    }

    throw new Error('No queue is registered for platform.');
  }
}
