/**
 * Terminal error handler (runtime middleware). Maps known errors to the canonical error
 * envelope and sanitises everything else to a generic 500 — never leaks internals.
 */
import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { logger } from '../../config/logger.js'
import { err } from '../../utils/response.util.js'

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const requestId = req.requestId ?? req.header('x-request-id') ?? ''

  if (error instanceof ZodError) {
    res.status(400).json(err('VALIDATION_ERROR', 'Invalid request payload', requestId))
    return
  }

  const message = error instanceof Error ? error.message : 'Unexpected error'
  logger.error({ event: 'request.error', requestId, err: message })
  res.status(500).json(err('INTERNAL_ERROR', 'Internal server error', requestId))
}
