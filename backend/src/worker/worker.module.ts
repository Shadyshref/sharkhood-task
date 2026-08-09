import { Module } from '@nestjs/common';

import { AppModule } from '../app.module';

import { OperationsWorkerModule } from '../operations/operations-worker.module';

@Module({
  imports: [AppModule, OperationsWorkerModule],
})
export class WorkerModule {}
