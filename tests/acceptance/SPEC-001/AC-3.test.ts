/**
 * SPEC-001 AC-3 — malformed input is a 400 VALIDATION_ERROR (Zod at the route boundary).
 */
import request from 'supertest'
import { app } from '../../../src/runtime/app.js'

describe('AC-3: register rejects invalid input', () => {
  it('AC-3: a malformed email or too-short password returns 400 VALIDATION_ERROR', async () => {
    const badEmail = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'correct horse battery' })
    expect(badEmail.status).toBe(400)
    expect(badEmail.body.ok).toBe(false)
    expect(badEmail.body.error.code).toBe('VALIDATION_ERROR')

    const shortPassword = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: `ac3-${Date.now()}@example.com`, password: 'short' })
    expect(shortPassword.status).toBe(400)
    expect(shortPassword.body.error.code).toBe('VALIDATION_ERROR')
  })
})
