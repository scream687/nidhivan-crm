import * as Sentry from '@sentry/node';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import * as cookieParser from 'cookie-parser';
import { setDefaultResultOrder } from 'node:dns';

// Render containers have no IPv6 route — resolve IPv4 first or SMTP (Gmail) hangs on ENETUNREACH
setDefaultResultOrder('ipv4first');

// Sentry must initialise before any other imports touch instrumented modules
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Security headers — helmet must be applied before any routes
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'", "wss:"],
          fontSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
    }),
  );

  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');

  // Strict CORS — only allow the configured frontend origin
  const allowed = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:3005',
    'http://127.0.0.1:3005',
    'http://localhost:4000',
  ];
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin || allowed.includes(origin)) return cb(null, true);
      // LAN and quick-tunnel origins are dev conveniences only. *.trycloudflare.com is a
      // shared public suffix — trusting it with credentials:true lets anyone with a free
      // tunnel make authenticated cross-origin calls. In prod, point FRONTEND_URL at the
      // real host (tunnel URL included) instead.
      if (
        process.env.NODE_ENV !== 'production' &&
        (origin.startsWith('http://192.168.') || origin.endsWith('.trycloudflare.com'))
      ) {
        return cb(null, true);
      }
      cb(new Error(`CORS: ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'X-Response-Time'],
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const port = parseInt(process.env.PORT || '3001', 10);
  await app.listen(port, '0.0.0.0');
  logger.log(
    `Nidhivan CRM API on :${port} [${process.env.NODE_ENV ?? 'development'}]`,
  );

  // Graceful shutdown — give in-flight requests time to finish
  const shutdown = async (signal: string) => {
    logger.log(`${signal} — shutting down gracefully`);
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
