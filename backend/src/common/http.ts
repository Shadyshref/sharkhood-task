import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { ApiErrorResponse, ErrorCode } from './contracts';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: () => void) {
    const requestId = req.header('x-request-id') || randomUUID();

    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    next();
  }
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

    let code = ErrorCode.INTERNAL_ERROR;

    let message = 'An unexpected server error occurred.';

    let details: unknown;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();

      const body = exception.getResponse();

      if (typeof body === 'object' && body !== null) {
        const value = body as Record<string, unknown>;

        message =
          typeof value.message === 'string'
            ? value.message
            : 'The request could not be processed.';

        details = value.message;

        code = (value.code as ErrorCode) ?? ErrorCode.INTERNAL_ERROR;
      } else if (typeof body === 'string') {
        message = body;
      }
    }

    const payload: ApiErrorResponse = {
      statusCode,
      code,
      message,
      requestId: request.requestId ?? 'unknown',

      ...(details ? { details } : {}),
    };

    response.status(statusCode).json(payload);
  }
}
