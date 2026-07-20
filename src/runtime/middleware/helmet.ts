/** Security headers via Helmet (runtime middleware). HSTS enabled with a 1-year max-age. */
import helmet from 'helmet'
import type { RequestHandler } from 'express'

export const securityHeaders: RequestHandler = helmet({
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
})
