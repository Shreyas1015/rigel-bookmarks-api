/**
 * Service tests — auth.service against a real Postgres (the harness has no ESM module-mock
 * story; exercising the real repo + argon2 is both simpler and higher-fidelity). Covers every
 * branch: register happy + duplicate, login happy + unknown + wrong-password, getById + not-found.
 * Requires the test DB (docker compose postgres) — outside the per-layer gate.
 */
import '../../integration/setup.js' // side-effect: sync schema (beforeAll) + truncate (beforeEach)
import * as authService from '../../../src/services/auth.service.js'
import { ConflictError, NotFoundError, UnauthorizedError } from '../../../src/utils/errors.util.js'
import { newId } from '../../../src/utils/uuid.util.js'

const PASSWORD = 'correct horse battery'

describe('authService.register', () => {
  it('creates a user and returns a safe projection (no passwordHash)', async () => {
    const user = await authService.register({ email: 'reg@example.com', password: PASSWORD })
    expect(typeof user.id).toBe('string')
    expect(user.email).toBe('reg@example.com')
    expect(user.roles).toContain('user')
    expect(user).not.toHaveProperty('passwordHash')
  })

  it('rejects a duplicate email with ConflictError', async () => {
    await authService.register({ email: 'dup@example.com', password: PASSWORD })
    await expect(
      authService.register({ email: 'dup@example.com', password: 'another password' })
    ).rejects.toBeInstanceOf(ConflictError)
  })
})

describe('authService.login', () => {
  it('returns the user for correct credentials', async () => {
    await authService.register({ email: 'login@example.com', password: PASSWORD })
    const user = await authService.login({ email: 'login@example.com', password: PASSWORD })
    expect(user.email).toBe('login@example.com')
  })

  it('rejects an unknown email with UnauthorizedError', async () => {
    await expect(
      authService.login({ email: 'ghost@example.com', password: PASSWORD })
    ).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('rejects a wrong password with UnauthorizedError', async () => {
    await authService.register({ email: 'wrongpw@example.com', password: PASSWORD })
    await expect(
      authService.login({ email: 'wrongpw@example.com', password: 'not the password' })
    ).rejects.toBeInstanceOf(UnauthorizedError)
  })
})

describe('authService.getById', () => {
  it('returns the account, and throws NotFoundError for an unknown id', async () => {
    const created = await authService.register({ email: 'byid@example.com', password: PASSWORD })
    const found = await authService.getById(created.id)
    expect(found.email).toBe('byid@example.com')
    await expect(authService.getById(newId())).rejects.toBeInstanceOf(NotFoundError)
  })
})
