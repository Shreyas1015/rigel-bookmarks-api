/**
 * Integration tests — auth routes over the real Express app + Postgres/Redis. HTTP contract:
 * status codes, canonical envelope, the httpOnly refresh cookie, and the requireAuth context.
 * Requires the test DB/Redis (docker compose) — outside the per-layer gate.
 */
import request from 'supertest'
import { app } from '../../src/runtime/app.js'
import './setup.js' // side-effect: sync schema (beforeAll) + truncate (beforeEach)

const PASSWORD = 'correct horse battery'

function refreshCookie(res: request.Response): string | undefined {
  const setCookie = res.headers['set-cookie'] as unknown as string[] | undefined
  return (setCookie ?? []).find((c) => c.startsWith('refresh_token='))
}

describe('POST /api/v1/auth/register', () => {
  it('returns 201 with an access token, a safe user, and an httpOnly refresh cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'reg@example.com', password: PASSWORD })
    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(typeof res.body.data.accessToken).toBe('string')
    expect(res.body.data.user.email).toBe('reg@example.com')
    expect(res.body.data.user).not.toHaveProperty('passwordHash')
    const cookie = refreshCookie(res)
    expect(cookie).toBeDefined()
    expect(cookie!.toLowerCase()).toContain('httponly')
  })

  it('returns 409 CONFLICT on a duplicate email', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'd@example.com', password: PASSWORD })
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'd@example.com', password: PASSWORD })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('CONFLICT')
  })

  it('returns 400 VALIDATION_ERROR on a malformed body', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'short' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('POST /api/v1/auth/login', () => {
  it('returns 200 for correct credentials and 401 for a wrong password', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'l@example.com', password: PASSWORD })

    const ok = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'l@example.com', password: PASSWORD })
    expect(ok.status).toBe(200)
    expect(typeof ok.body.data.accessToken).toBe('string')

    const bad = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'l@example.com', password: 'wrong password' })
    expect(bad.status).toBe(401)
    expect(bad.body.error.code).toBe('UNAUTHORIZED')
  })
})

describe('GET /api/v1/auth/me', () => {
  it('returns 401 without a token and 200 with the caller when authenticated', async () => {
    const anon = await request(app).get('/api/v1/auth/me')
    expect(anon.status).toBe(401)

    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'me@example.com', password: PASSWORD })
    const token = reg.body.data.accessToken as string

    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`)
    expect(me.status).toBe(200)
    expect(me.body.data.id).toBe(reg.body.data.user.id)
    expect(me.body.data.email).toBe('me@example.com')
  })
})

describe('POST /api/v1/auth/refresh', () => {
  it('issues a new access token from the refresh cookie and 401 without it', async () => {
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'r@example.com', password: PASSWORD })
    const cookie = refreshCookie(reg)!

    const refreshed = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie)
    expect(refreshed.status).toBe(200)
    expect(typeof refreshed.body.data.accessToken).toBe('string')

    const noCookie = await request(app).post('/api/v1/auth/refresh')
    expect(noCookie.status).toBe(401)
  })
})
