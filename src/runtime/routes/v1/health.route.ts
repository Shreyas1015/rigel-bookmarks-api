/**
 * Health routes (runtime).
 *   /health — liveness: process is up (always 200, no dependencies).
 *   /ready  — readiness: DB ping + Redis ping (200 when both reachable, else 503).
 */
import { Router } from 'express'
import { sequelize } from '../../../config/database.js'
import { redis } from '../../../providers/redis.js'
import { ok, err } from '../../../utils/response.util.js'

export const healthRouter: Router = Router()

healthRouter.get('/health', (req, res) => {
  res.status(200).json(ok({ status: 'ok' }, req.requestId ?? ''))
})

healthRouter.get('/ready', async (req, res) => {
  const requestId = req.requestId ?? ''
  try {
    await sequelize.authenticate()
    await redis.ping()
    res.status(200).json(ok({ db: 'up', redis: 'up' }, requestId))
  } catch {
    res
      .status(503)
      .json(err('INTERNAL_ERROR', 'One or more dependencies are unavailable', requestId))
  }
})
