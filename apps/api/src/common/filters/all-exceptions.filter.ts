import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const raw =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message =
      raw && typeof raw === 'object' && 'message' in (raw as object)
        ? (raw as any).message
        : raw ?? 'Internal server error';

    const body = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.url,
      method: req.method,
      requestId: (req.headers['x-request-id'] as string) ?? 'unknown',
      message,
    };

    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      if (process.env.SENTRY_DSN) {
        Sentry.captureException(exception, {
          extra: { method: req.method, url: req.url, requestId: body.requestId },
        });
      }
    } else {
      this.logger.warn(`${req.method} ${req.url} → ${status}: ${JSON.stringify(message)}`);
    }

    res.status(status).json(body);
  }
}
