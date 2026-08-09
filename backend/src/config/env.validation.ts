import * as Joi from 'joi';

interface EnvConfig {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  LOG_LEVEL: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

  MONGODB_URI: string;
  REDIS_URL: string;

  SWAGGER_ENABLED: boolean;
  FRONTEND_ORIGIN: string;

  SCRAPING_HTTP_TIMEOUT_MS: number;
  SCRAPING_CONNECT_TIMEOUT_MS: number;

  TRIPADVISOR_CONCURRENCY: number;
  TRIPADVISOR_REQUESTS_PER_MINUTE: number;

  OPENTABLE_CONCURRENCY: number;
  OPENTABLE_REQUESTS_PER_MINUTE: number;

  OPENSTREETMAP_CONCURRENCY: number;
  OPENSTREETMAP_REQUESTS_PER_MINUTE: number;
}

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const schema = Joi.object<EnvConfig>({
    NODE_ENV: Joi.string()
      .valid('development', 'test', 'production')
      .default('development'),

    PORT: Joi.number().port().default(3001),

    LOG_LEVEL: Joi.string()
      .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace')
      .default('info'),

    MONGODB_URI: Joi.string()
      .uri({ scheme: ['mongodb', 'mongodb+srv'] })
      .required(),

    REDIS_URL: Joi.string()
      .uri({ scheme: ['redis', 'rediss'] })
      .required(),

    SWAGGER_ENABLED: Joi.boolean().default(true),

    FRONTEND_ORIGIN: Joi.string().uri().default('http://localhost:3000'),

    SCRAPING_HTTP_TIMEOUT_MS: Joi.number().integer().min(1000).default(20000),

    SCRAPING_CONNECT_TIMEOUT_MS: Joi.number().integer().min(1000).default(5000),

    TRIPADVISOR_CONCURRENCY: Joi.number().integer().min(1).max(10).default(2),

    TRIPADVISOR_REQUESTS_PER_MINUTE: Joi.number().integer().min(1).default(20),

    OPENTABLE_CONCURRENCY: Joi.number().integer().min(1).max(10).default(2),

    OPENTABLE_REQUESTS_PER_MINUTE: Joi.number().integer().min(1).default(20),

    OPENSTREETMAP_CONCURRENCY: Joi.number().integer().min(1).max(2).default(1),

    OPENSTREETMAP_REQUESTS_PER_MINUTE: Joi.number()
      .integer()
      .min(1)
      .max(60)
      .default(10),
  }).unknown(true);

  const result = schema.validate(config, {
    abortEarly: false,
    convert: true,
  });

  if (result.error !== undefined) {
    throw new Error(
      `Invalid environment configuration: ${result.error.message}`,
    );
  }

  return result.value;
}
