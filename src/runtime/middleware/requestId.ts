/**
 * X-Request-ID propagation (runtime middleware). Reuses an incoming request id or mints a
 * new UUIDv7, exposes it on `req.requestId`, and echoes it back on the response.
 */
import type { RequestHandler } from 'express'
import { newId } from '../../utils/uuid.util.js'

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string
  }
}

export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.header('x-request-id')
  const id = incoming && incoming.length > 0 ? incoming : newId()
  req.requestId = id
  res.setHeader('X-Request-ID', id)
  next()
}
