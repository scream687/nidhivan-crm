import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(4000),
  DATABASE_URL: Joi.string().required(),
  // No default: an unset REDIS_URL must mean "no Redis", not "localhost".
  // Defaulting made RedisModule build a client that could never connect.
  REDIS_URL: Joi.string().allow('').optional(),
  JWT_SECRET: Joi.string().min(32).required(),
  FRONTEND_URL: Joi.string().default('http://localhost:3000'),
  // Exotel — fallbacks only. Settings → Telephony writes these to the database,
  // which takes precedence. Exotel authenticates with API Key + API Token; the
  // SID is path-only, not a credential.
  EXOTEL_API_KEY: Joi.string().allow('').optional(),
  EXOTEL_SID: Joi.string().allow('').optional(),
  EXOTEL_TOKEN: Joi.string().allow('').optional(),
  EXOTEL_VIRTUAL_NUMBER: Joi.string().allow('').optional(),
  EXOTEL_SUBDOMAIN: Joi.string().allow('').optional(),
  // Used to build the webhook URLs handed to Exotel and the listing portals, so
  // in production this must be the publicly reachable origin.
  API_URL: Joi.string().allow('').optional(),
  // Sentry — optional; error reporting activates only when DSN is set
  SENTRY_DSN: Joi.string().uri().allow('').optional(),
  // Facebook Lead Ads — fallbacks only; Settings → Integrations takes precedence.
  //
  // FB_VERIFY_TOKEN deliberately has NO default. ConfigModule assigns validated
  // values back onto process.env, so a default here would put a token committed
  // to this repo into every deployment and quietly defeat the fail-closed check
  // in the webhook handshake. Unset must mean unset.
  FB_VERIFY_TOKEN: Joi.string().allow('').optional(),
  FB_APP_SECRET: Joi.string().allow('').optional(),
  FB_PAGE_ACCESS_TOKEN: Joi.string().allow('').optional(),
  // Cloudflare R2 — optional so local dev boots without it, but upload and
  // document routes return 503 until all four are set.
  R2_ACCOUNT_ID: Joi.string().allow('').optional(),
  R2_ACCESS_KEY_ID: Joi.string().allow('').optional(),
  R2_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),
  R2_BUCKET: Joi.string().allow('').optional(),
  // Public bucket domain (r2.dev or custom). Marketing assets are stored as
  // absolute URLs built from this, so it must be stable.
  R2_PUBLIC_BASE_URL: Joi.string().uri().allow('').optional(),
});
