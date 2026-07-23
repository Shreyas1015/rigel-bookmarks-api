/**
 * Cross-User Isolation Test — bookmarks (the most important security test).
 *
 * Adapted from isolation.test.template.ts for the first owned resource. Enforced by
 * tests/architecture/isolation.test.ts (the gate fails if this file is missing while
 * bookmark.repo.ts scopes by userId).
 *
 * Invariant (ARCHITECTURE.md, Repo layer): a bookmark owned by user A must be invisible to
 * user B. When B requests A's bookmark, the API responds 404 — NEVER 403.
 *
 * Runs against the migrated schema (jest globalSetup) with two REAL registered users, so the
 * userId FK → users is satisfied. Seeds once in beforeAll and does not truncate between cases.
 */
import request from 'supertest'
import { app } from '../../src/runtime/app.js'

const uniqueEmail = (p: string): string =>
  `${p}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

async function registerUser(prefix: string): Promise<string> {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email: uniqueEmail(prefix), password: 'correct horse battery' })
  return res.body.data.accessToken as string
}

describe('cross-user isolation: bookmarks', () => {
  let tokenA: string
  let tokenB: string
  let resourceId: string

  beforeAll(async () => {
    tokenA = await registerUser('iso-a')
    tokenB = await registerUser('iso-b')

    const created = await request(app)
      .post('/api/v1/bookmarks')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ url: 'https://example.com/owned-by-a', title: "A's private bookmark" })
    resourceId = created.body.data.id as string
  })

  it("user B cannot READ user A's bookmark (404, not 403)", async () => {
    const res = await request(app)
      .get(`/api/v1/bookmarks/${resourceId}`)
      .set('Authorization', `Bearer ${tokenB}`)
    expect(res.status).toBe(404)
    expect(res.body.ok).toBe(false)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  it("user B cannot UPDATE user A's bookmark (404)", async () => {
    const res = await request(app)
      .patch(`/api/v1/bookmarks/${resourceId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ title: 'hijack attempt' })
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  it("user B cannot DELETE user A's bookmark (404)", async () => {
    const res = await request(app)
      .delete(`/api/v1/bookmarks/${resourceId}`)
      .set('Authorization', `Bearer ${tokenB}`)
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  it("user A's bookmark never appears in user B's list", async () => {
    const res = await request(app).get('/api/v1/bookmarks').set('Authorization', `Bearer ${tokenB}`)
    expect(res.status).toBe(200)
    const ids = (res.body.data.items as Array<{ id: string }>).map((r) => r.id)
    expect(ids).not.toContain(resourceId)
  })

  it('user A (the owner) can still read their own bookmark (200)', async () => {
    const res = await request(app)
      .get(`/api/v1/bookmarks/${resourceId}`)
      .set('Authorization', `Bearer ${tokenA}`)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(resourceId)
  })
})
