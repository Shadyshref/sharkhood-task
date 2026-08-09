import { Platform } from '../common/contracts';

export const QueueName = {
  [Platform.TRIPADVISOR]: 'scrape-tripadvisor',
  [Platform.OPENTABLE]: 'scrape-opentable',
  [Platform.OPENSTREETMAP]: 'scrape-openstreetmap',
} as const;

export interface ScrapeJobData {
  taskId: string;
}
