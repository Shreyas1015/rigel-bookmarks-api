/**
 * ioredis singleton (providers layer). Lazy-connect so importing this module never
 * opens a socket at load time (keeps tests/gate side-effect-free until first use).
 * `maxRetriesPerRequest: null` is required for BullMQ compatibility.
 */
import { Redis } from 'ioredis'
import { env } from '../config/env.js'
import { logger } from '../config/logger.js'

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: null,
  retryStrategy: (times: number) => Math.min(times * 200, 2000),
})

redis.on('error', (error: Error) => {
  logger.error({ event: 'redis.error', err: error.message })
})
