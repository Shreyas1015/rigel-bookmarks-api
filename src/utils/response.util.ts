/**
 * Canonical response-envelope helpers (utils layer — type-only import from Types allowed).
 *   ok(data, requestId)        → { ok: true,  data, meta: { requestId, timestamp } }
 *   err(code, message, reqId)  → { ok: false, error: { code, message }, meta: { requestId } }
 */
import type { ErrorCode, ErrorEnvelope, SuccessEnvelope } from '../types/api.types.js'

export function ok<T>(data: T, requestId: string): SuccessEnvelope<T> {
  return {
    ok: true,
    data,
    meta: { requestId, timestamp: new Date().toISOString() },
  }
}

export function err(code: ErrorCode, message: string, requestId: string): ErrorEnvelope {
  return {
    ok: false,
    error: { code, message },
    meta: { requestId },
  }
}
