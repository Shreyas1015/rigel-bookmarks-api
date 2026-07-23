/**
 * SPEC-002 AC-3 — cross-user isolation: user B gets 404 (never 403) for user A's bookmark on
 * read / update / delete. A 404 reveals nothing; a 403 would confirm the resource exists.
 */
import request from 'supertest'
import { app } from '../../../src/runtime/app.js'

const uniqueEmail = (p: string): string =>
  `${p}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

async function tokenFor(p: string): Promise<string> {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email: uniqueEmail(p), password: 'correct horse battery' })
  return res.body.data.accessToken as string
}

describe('AC-3: cross-user access is 404 (isolation, never 403)', () => {
  it("AC-3: user B GET/PATCH/DELETE of user A's bookmark returns 404 NOT_FOUND", async () => {
    const tokenA = await tokenFor('ac3a')
    const tokenB = await tokenFor('ac3b')

    const created = await request(app)
      .post('/api/v1/bookmarks')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ url: 'https://example.com/owned-by-a', title: 'A owns this' })
    expect(created.status).toBe(201)
    const id = created.body.data.id as string

    const get = await request(app)
      .get(`/api/v1/bookmarks/${id}`)
      .set('Authorization', `Bearer ${tokenB}`)
    expect(get.status).toBe(404)
    expect(get.body.error.code).toBe('NOT_FOUND')

    const patch = await request(app)
      .patch(`/api/v1/bookmarks/${id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ title: 'hijack attempt' })
    expect(patch.status).toBe(404)
    expect(patch.body.error.code).toBe('NOT_FOUND')

    const del = await request(app)
      .delete(`/api/v1/bookmarks/${id}`)
      .set('Authorization', `Bearer ${tokenB}`)
    expect(del.status).toBe(404)
    expect(del.body.error.code).toBe('NOT_FOUND')
  })
})
