/**
 * Rate limiting with a shared Redis store (runtime middleware). Three tiers:
 *   - globalLimiter: broad per-IP ceiling for all traffic
 *   - authLimiter:   tighter ceiling for auth endpoints (brute-force defence)
 *   - strictLimiter: strictest ceiling for sensitive mutations
 */
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'
import { redis } from '../../providers/redis.js'

function makeLimiter(windowMs: number, max: number): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      // rate-limit-redis passes the raw Redis command + args; forward them to ioredis.
      sendCommand: (...args: string[]): Promise<number> =>
        redis.call(args[0] ?? '', ...args.slice(1)) as Promise<number>,
    }),
  })
}

export const globalLimiter = makeLimiter(60_000, 100)
export const authLimiter = makeLimiter(60_000, 10)
export const strictLimiter = makeLimiter(60_000, 5)
