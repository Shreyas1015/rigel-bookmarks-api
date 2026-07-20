/**
 * SPEC-001 AC-5 — /me requires auth and returns the caller's own account (the auth context
 * that later features scope ownership by).
 */
import request from 'supertest'
import { app } from '../../../src/runtime/app.js'

const uniqueEmail = (): string =>
  `ac5-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

describe('AC-5: /me exposes the authenticated caller', () => {
  it('AC-5: GET /api/v1/auth/me is 401 without a token and 200 with the caller id+email when authenticated', async () => {
    const anon = await request(app).get('/api/v1/auth/me')
    expect(anon.status).toBe(401)
    expect(anon.body.ok).toBe(false)

    const email = uniqueEmail()
    const registered = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: 'correct horse battery' })
    expect(registered.status).toBe(201)
    const token = registered.body.data.accessToken as string
    const userId = registered.body.data.user.id as string

    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`)
    expect(me.status).toBe(200)
    expect(me.body.data.id).toBe(userId)
    expect(me.body.data.email).toBe(email)
  })
})
