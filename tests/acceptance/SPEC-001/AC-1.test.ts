/**
 * SPEC-001 AC-1 — register returns 201 with an access token + safe user, and sets the
 * httpOnly refresh cookie. Red before the auth routes exist; green once F1 lands.
 */
import request from 'supertest'
import { app } from '../../../src/runtime/app.js'

const uniqueEmail = (): string =>
  `ac1-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

describe('AC-1: register creates an account and issues tokens', () => {
  it('AC-1: POST /api/v1/auth/register returns 201 with accessToken + safe user + httpOnly refresh cookie', async () => {
    const email = uniqueEmail()
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: 'correct horse battery' })

    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(typeof res.body.data.accessToken).toBe('string')
    expect(res.body.data.accessToken.length).toBeGreaterThan(0)
    expect(res.body.data.user.email).toBe(email)
    expect(typeof res.body.data.user.id).toBe('string')
    expect(res.body.data.user).not.toHaveProperty('passwordHash')

    const setCookie = res.headers['set-cookie'] as unknown as string[]
    const refresh = (setCookie ?? []).find((c) => c.startsWith('refresh_token='))
    expect(refresh).toBeDefined()
    expect(refresh!.toLowerCase()).toContain('httponly')
  })
})
