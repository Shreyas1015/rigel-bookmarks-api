/**
 * SPEC-001 AC-2 — a duplicate email is a 409 CONFLICT.
 */
import request from 'supertest'
import { app } from '../../../src/runtime/app.js'

const uniqueEmail = (): string =>
  `ac2-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

describe('AC-2: duplicate email registration is rejected', () => {
  it('AC-2: a second POST /api/v1/auth/register with the same email returns 409 CONFLICT', async () => {
    const email = uniqueEmail()
    const first = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: 'correct horse battery' })
    expect(first.status).toBe(201)

    const second = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: 'a different password' })
    expect(second.status).toBe(409)
    expect(second.body.ok).toBe(false)
    expect(second.body.error.code).toBe('CONFLICT')
  })
})
