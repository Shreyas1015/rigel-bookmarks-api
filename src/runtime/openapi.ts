/**
 * OpenAPI contract registry (runtime). Routes register their Zod schemas + paths here so
 * `npm run openapi:export` emits docs/generated/openapi.{json,yaml} — the frontend's
 * openapi-fetch source of truth. `extendZodWithOpenApi(z)` must run once before any schema
 * uses `.openapi(...)`.
 */
import { OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

extendZodWithOpenApi(z) // enables `.openapi()` metadata on Zod schemas (call once, at import time)

export const registry = new OpenAPIRegistry()
// Each route registers itself, e.g.:
//   registry.registerPath({ method: 'post', path: '/bookmarks', request: {...}, responses: {...} })
// `scripts/openapi.export.ts` imports this `registry` and generates the document.
