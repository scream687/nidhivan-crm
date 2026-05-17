import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;

    const requestId =
      (req.headers['x-request-id'] as string) || uuidv4();
    req.headers['x-request-id'] = requestId;

    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const ms = Date.now() - start;
          res.setHeader('X-Request-Id', requestId);
          res.setHeader('X-Response-Time', `${ms}ms`);
          this.logger.log(
            `${method} ${url} ${res.statusCode} ${ms}ms [${requestId}]`,
          );
        },
        error: () => {
          const ms = Date.now() - start;
          this.logger.error(`${method} ${url} ERROR ${ms}ms [${requestId}]`);
        },
      }),
    );
  }
}
