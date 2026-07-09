import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    if (req.method === 'GET') return next.handle();

    const { method, url, user, ip, headers } = req;
    const entity = url.split('/')[3] || url.split('/')[2] || url;

    return next.handle().pipe(
      tap({
        next: async () => {
          await this.audit.log({
            userId: user?.id,
            action: method,
            entity,
            ipAddress: ip,
            userAgent: headers?.['user-agent'],
          }).catch((e) => console.error("async", e));
        },
        error: async () => {
          await this.audit.log({
            userId: user?.id,
            action: method,
            entity,
            ipAddress: ip,
            userAgent: headers?.['user-agent'],
          }).catch((e) => console.error("async", e));
        },
      }),
    );
  }
}
