/**
 * Idempotency-Key middleware (runtime). Apply to mutating routes. On the first request with
 * an `Idempotency-Key` header it caches the response keyed by {userId}:{method}:{path}:{key};
 * a replay returns the cached response with `Idempotent-Replay: true`; a still-in-flight key
 * returns 409 CONFLICT. Non-mutating methods and keyless requests pass straight through.
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { logger } from '../../config/logger.js'
import { err } from '../../utils/response.util.js'
import { redis } from '../../providers/redis.js'

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const RESULT_TTL_SECONDS = 24 * 60 * 60
const LOCK_TTL_SECONDS = 60

interface CachedResponse {
  status: number
  body: unknown
}

export const idempotency: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const key = req.header('idempotency-key')
  if (!MUTATING.has(req.method) || !key) {
    next()
    return
  }
  void handle(req, res, next, key)
}

async function handle(req: Request, res: Response, next: NextFunction, key: string): Promise<void> {
  const requestId = req.requestId ?? ''
  const userId = req.auth?.sub ?? 'anon'
  const cacheKey = `idem:${userId}:${req.method}:${req.path}:${key}`
  const lockKey = `${cacheKey}:lock`

  const existing = await redis.get(cacheKey)
  if (existing !== null) {
    const cached = JSON.parse(existing) as CachedResponse
    res.setHeader('Idempotent-Replay', 'true')
    res.status(cached.status).json(cached.body)
    return
  }

  const locked = await redis.set(lockKey, '1', 'EX', LOCK_TTL_SECONDS, 'NX')
  if (locked === null) {
    res.status(409).json(err('CONFLICT', 'Request already in progress', requestId))
    return
  }

  const originalJson = res.json.bind(res)
  res.json = ((body: unknown): Response => {
    const payload = JSON.stringify({ status: res.statusCode, body } satisfies CachedResponse)
    void redis
      .set(cacheKey, payload, 'EX', RESULT_TTL_SECONDS)
      .catch((e: unknown) =>
        logger.error({
          event: 'idempotency.persist_failed',
          err: e instanceof Error ? e.message : String(e),
        })
      )
      .finally(() => {
        void redis.del(lockKey)
      })
    return originalJson(body)
  }) as Response['json']

  next()
}
