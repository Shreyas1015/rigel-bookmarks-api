/**
 * Unit tests — domain error taxonomy (utils, 100% coverage required).
 */
import {
  AppError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../../src/utils/errors.util.js'

describe('errors.util', () => {
  it('AppError carries code, status, message, and its subclass name', () => {
    const e = new AppError('INTERNAL_ERROR', 500, 'boom')
    expect(e).toBeInstanceOf(Error)
    expect(e.code).toBe('INTERNAL_ERROR')
    expect(e.status).toBe(500)
    expect(e.message).toBe('boom')
    expect(e.name).toBe('AppError')
  })

  it('ConflictError -> 409 / CONFLICT', () => {
    const e = new ConflictError('dup email')
    expect(e).toBeInstanceOf(AppError)
    expect(e.status).toBe(409)
    expect(e.code).toBe('CONFLICT')
    expect(e.name).toBe('ConflictError')
    expect(e.message).toBe('dup email')
  })

  it('UnauthorizedError -> 401 / UNAUTHORIZED', () => {
    const e = new UnauthorizedError('nope')
    expect(e).toBeInstanceOf(AppError)
    expect(e.status).toBe(401)
    expect(e.code).toBe('UNAUTHORIZED')
    expect(e.name).toBe('UnauthorizedError')
  })

  it('NotFoundError -> 404 / NOT_FOUND', () => {
    const e = new NotFoundError('missing')
    expect(e).toBeInstanceOf(AppError)
    expect(e.status).toBe(404)
    expect(e.code).toBe('NOT_FOUND')
    expect(e.name).toBe('NotFoundError')
  })

  it('ValidationError -> 422 / VALIDATION_ERROR', () => {
    const e = new ValidationError('bad url')
    expect(e).toBeInstanceOf(AppError)
    expect(e.status).toBe(422)
    expect(e.code).toBe('VALIDATION_ERROR')
    expect(e.name).toBe('ValidationError')
    expect(e.message).toBe('bad url')
  })
})
