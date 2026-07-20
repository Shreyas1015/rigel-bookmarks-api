/**
 * Domain error taxonomy (utils layer — type-only import from Types allowed).
 *
 * Services throw these; the runtime `errorHandler` maps an `AppError` to its HTTP status +
 * the canonical envelope `error.code`. Keeps HTTP concerns out of the service layer while
 * letting services signal precise outcomes (conflict, unauthorized, not-found).
 */
import type { ErrorCode } from '../types/api.types.js'

export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: number

  constructor(code: ErrorCode, status: number, message: string) {
    super(message)
    this.name = new.target.name
    this.code = code
    this.status = status
  }
}

/** 409 — a uniqueness/precondition conflict (e.g. email already registered). */
export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', 409, message)
  }
}

/** 401 — authentication failed or is missing. */
export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super('UNAUTHORIZED', 401, message)
  }
}

/** 404 — the resource does not exist (or is invisible to the caller — ownership isolation). */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super('NOT_FOUND', 404, message)
  }
}
