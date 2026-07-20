/**
 * SPEC-001 AC-6 — the httpOnly refresh cookie can be exchanged for a fresh access token;
 * a missing cookie is 401.
 */
import request from 'supertest'
import { app } from '../../../src/runtime/app.js'

const uniqueEmail = (): string =>
  `ac6-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

describe('AC-6: refresh exchanges the httpOnly cookie for a new access token', () => {
  it('AC-6: POST /api/v1/auth/refresh returns 200 with a new accessToken from the cookie, and 401 without it', async () => {
    const email = uniqueEmail()
    const registered = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: 'correct horse battery' })
    expect(registered.status).toBe(201)

    const setCookie = registered.headers['set-cookie'] as unknown as string[]
    const refreshCookie = (setCookie ?? []).find((c) => c.startsWith('refresh_token='))
    expect(refreshCookie).toBeDefined()

    const refreshed = await request(app).post('/api/v1/auth/refresh').set('Cookie', refreshCookie!)
    expect(refreshed.status).toBe(200)
    expect(typeof refreshed.body.data.accessToken).toBe('string')
    expect(refreshed.body.data.accessToken.length).toBeGreaterThan(0)

    const noCookie = await request(app).post('/api/v1/auth/refresh')
    expect(noCookie.status).toBe(401)
    expect(noCookie.body.ok).toBe(false)
  })
})
