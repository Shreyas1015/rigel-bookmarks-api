/**
 * OpenAPI contract registry (runtime). Routes register their Zod schemas + paths here so
 * `npm run openapi:export` emits docs/generated/openapi.{json,yaml} — the frontend's
 * openapi-fetch source of truth. `extendZodWithOpenApi(z)` must run once before any schema
 * uses `.openapi(...)`.
 */
import { OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'
import { LoginSchema, RegisterSchema } from '../types/auth.types.js'

extendZodWithOpenApi(z) // enables `.openapi()` metadata on Zod schemas (call once, at import time)

export const registry = new OpenAPIRegistry()

// Paths are registered HERE (not in the route files): scripts/openapi.export.ts imports only this
// module, so a route-file registration would never run (and importing routes here would be a
// circular import — routes import this registry). Register request/response schemas per path.

// --- Auth & accounts (SPEC-001 / PLAN-001) ---
registry.registerPath({
  method: 'post',
  path: '/auth/register',
  tags: ['auth'],
  request: { body: { content: { 'application/json': { schema: RegisterSchema } } } },
  responses: { 201: { description: 'Account created; access token in body, refresh cookie set' } },
})
registry.registerPath({
  method: 'post',
  path: '/auth/login',
  tags: ['auth'],
  request: { body: { content: { 'application/json': { schema: LoginSchema } } } },
  responses: {
    200: { description: 'Authenticated; access token in body, refresh cookie set' },
    401: { description: 'Invalid credentials' },
  },
})
registry.registerPath({
  method: 'post',
  path: '/auth/refresh',
  tags: ['auth'],
  responses: {
    200: { description: 'New access token issued from the refresh cookie' },
    401: { description: 'Missing/invalid refresh cookie' },
  },
})
registry.registerPath({
  method: 'get',
  path: '/auth/me',
  tags: ['auth'],
  responses: {
    200: { description: 'The authenticated caller' },
    401: { description: 'Missing/invalid access token' },
  },
})
