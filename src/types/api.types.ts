/**
 * Canonical API response envelope + error-code enum.
 * Single source of truth for the shape every route returns (see .claude/rules/api.md).
 * Types layer: zero imports from any other layer.
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'

export interface SuccessEnvelope<T> {
  ok: true
  data: T
  meta: { requestId: string; timestamp: string }
}

export interface ErrorEnvelope {
  ok: false
  error: { code: ErrorCode; message: string }
  meta: { requestId: string }
}

export type Envelope<T> = SuccessEnvelope<T> | ErrorEnvelope
