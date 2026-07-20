/**
 * requirePermission — role guard (providers/auth). Assumes `requireAuth` ran first so
 * `req.auth` is populated; responds 403 with the canonical envelope when the role is absent.
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { err } from '../../utils/response.util.js'

export function requirePermission(role: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = req.requestId ?? req.header('x-request-id') ?? ''
    const roles = req.auth?.roles ?? []
    if (!roles.includes(role)) {
      res.status(403).json(err('FORBIDDEN', 'Insufficient permissions', requestId))
      return
    }
    next()
  }
}
