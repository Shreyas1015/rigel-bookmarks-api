/** CORS with an env-driven origin allowlist (runtime middleware). */
import cors from 'cors'
import type { RequestHandler } from 'express'
import { corsOrigins } from '../../config/env.js'

export const corsMiddleware: RequestHandler = cors({
  origin: corsOrigins,
  credentials: true,
})
