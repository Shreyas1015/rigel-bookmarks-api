/**
 * SPEC-001 AC-4 — login succeeds with correct credentials and fails 401 on a wrong password.
 */
import request from 'supertest'
import { app } from '../../../src/runtime/app.js'

const uniqueEmail = (): string =>
  `ac4-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

describe('AC-4: login authenticates credentials', () => {
  it('AC-4: correct credentials return 200 with an accessToken; a wrong password returns 401 UNAUTHORIZED', async () => {
    const email = uniqueEmail()
    const password = 'correct horse battery'
    const registered = await request(app).post('/api/v1/auth/register').send({ email, password })
    expect(registered.status).toBe(201)

    const good = await request(app).post('/api/v1/auth/login').send({ email, password })
    expect(good.status).toBe(200)
    expect(typeof good.body.data.accessToken).toBe('string')
    expect(good.body.data.accessToken.length).toBeGreaterThan(0)

    const bad = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'wrong password entirely' })
    expect(bad.status).toBe(401)
    expect(bad.body.ok).toBe(false)
    expect(bad.body.error.code).toBe('UNAUTHORIZED')
  })
})
