/**
 * Zod-validated environment configuration. Fails fast (process.exit(1)) on invalid config.
 * This is the ONLY module allowed to read process.env directly (ESLint-enforced).
 */
import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // Database (PostgreSQL)
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  DATABASE_POOL_MIN: z.coerce.number().int().nonnegative().default(2),

  // Redis
  REDIS_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRY_SECONDS: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_EXPIRY_SECONDS: z.coerce.number().int().positive().default(604800),

  // CORS (comma-separated allowlist)
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  SERVICE_NAME: z.string().default('app'),

  // Observability (OpenTelemetry). Blank string is treated as unset ⇒ SDK no-ops.
  OTEL_EXPORTER_OTLP_ENDPOINT: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().url().optional()
  ),
  OTEL_SERVICE_NAME: z.string().default('app'),
  OTEL_METRIC_EXPORT_INTERVAL_MS: z.coerce.number().int().positive().default(10000),
  APP_VERSION: z.string().default('0.0.1'),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  // eslint-disable-next-line no-console -- env validation runs before the logger exists
  console.error('Invalid environment configuration:\n', z.prettifyError(parsed.error))
  process.exit(1)
}

export const env = parsed.data

/** Parsed CORS allowlist (trimmed, empty entries dropped). */
export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((s) => s.trim())
  .filter((s) => s.length > 0)
