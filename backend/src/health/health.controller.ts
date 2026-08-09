import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';

import mongoose, { Connection } from 'mongoose';
import Redis from 'ioredis';

@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,

    private readonly config: ConfigService,
  ) {}

  @Get('live')
  live() {
    return {
      status: 'ok',
    };
  }

  @Get('ready')
  async ready() {
    if (this.connection.readyState !== mongoose.ConnectionStates.connected) {
      throw new ServiceUnavailableException('MongoDB is not ready.');
    }

    const redis = new Redis(this.config.getOrThrow<string>('REDIS_URL'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });

    try {
      await redis.connect();

      await redis.ping();

      return {
        status: 'ok',
        mongo: 'ready',
        redis: 'ready',
      };
    } finally {
      redis.disconnect();
    }
  }
}
