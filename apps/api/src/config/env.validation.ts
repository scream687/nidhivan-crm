import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(4000),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().default('redis://localhost:6379'),
  JWT_SECRET: Joi.string().min(32).required(),
  FRONTEND_URL: Joi.string().default('http://localhost:3000'),
  // Exotel — optional until credentials are provisioned
  EXOTEL_SID: Joi.string().allow('').optional(),
  EXOTEL_TOKEN: Joi.string().allow('').optional(),
  EXOTEL_VIRTUAL_NUMBER: Joi.string().allow('').optional(),
  API_URL: Joi.string().allow('').optional(),
  // Sentry — optional; error reporting activates only when DSN is set
  SENTRY_DSN: Joi.string().uri().allow('').optional(),
  // Facebook Lead Ads — optional until app is created
  FB_VERIFY_TOKEN: Joi.string().default('nidhivan_crm_fb_2024'),
  FB_APP_SECRET: Joi.string().allow('').optional(),
  FB_PAGE_ACCESS_TOKEN: Joi.string().allow('').optional(),
});
