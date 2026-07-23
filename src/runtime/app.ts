/**
 * Express application (runtime composition root). Wires middleware in order and mounts routes.
 * `/health` + `/ready` are mounted BEFORE the rate limiter so liveness/readiness stay
 * dependency-light and are never throttled.
 */
import express, { type Express } from 'express'
import compression from 'compression'
import { requestId } from './middleware/requestId.js'
import { securityHeaders } from './middleware/helmet.js'
import { corsMiddleware } from './middleware/cors.js'
import { globalLimiter } from './middleware/rateLimiter.js'
import { errorHandler } from './middleware/errorHandler.js'
import { healthRouter } from './routes/v1/health.route.js'
import { authRouter } from './routes/v1/auth.route.js'
import { bookmarksRouter } from './routes/v1/bookmarks.route.js'

export const app: Express = express()

app.use(requestId)
app.use(securityHeaders)
app.use(corsMiddleware)
app.use(compression())
app.use(express.json())

// Liveness/readiness first — no rate limiting on health checks.
app.use(healthRouter)

// Everything past this point is rate-limited.
app.use(globalLimiter)

// Auth + accounts (SPEC-001). Mounted under the versioned API prefix.
app.use('/api/v1/auth', authRouter)

// Bookmarks CRUD (SPEC-002) — owner-scoped, requireAuth enforced at the router level.
app.use('/api/v1/bookmarks', bookmarksRouter)

// Terminal error handler — must be last.
app.use(errorHandler)
