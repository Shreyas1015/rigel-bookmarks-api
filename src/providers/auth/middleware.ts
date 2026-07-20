/**
 * requireAuth — Bearer-token authentication middleware (providers/auth).
 * On success it attaches the verified claims to `req.auth`; on failure it responds 401
 * with the canonical error envelope.
 */
import type { NextFunction, Request, Response } from 'express'
import { err } from '../../utils/response.util.js'
import { verifyAccessToken, type AccessTokenClaims } from './jwt.js'

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AccessTokenClaims
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const requestId = req.requestId ?? req.header('x-request-id') ?? ''
  const header = req.header('authorization')
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json(err('UNAUTHORIZED', 'Missing bearer token', requestId))
    return
  }
  try {
    req.auth = await verifyAccessToken(header.slice('Bearer '.length))
    next()
  } catch {
    res.status(401).json(err('UNAUTHORIZED', 'Invalid or expired token', requestId))
  }
}
