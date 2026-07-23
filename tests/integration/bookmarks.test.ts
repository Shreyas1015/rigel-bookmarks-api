/**
 * Integration tests — bookmark routes over the real Express app + Postgres/Redis. HTTP contract:
 * status codes, the canonical envelope, requireAuth (401), 422 validation, cursor pagination,
 * owner-scoped 404, and paranoid soft delete. Requires the test DB — outside the per-layer gate.
 */
import request from 'supertest'
import { app } from '../../src/runtime/app.js'
import './setup.js' // side-effect: sync schema (beforeAll) + truncate (beforeEach)

const PASSWORD = 'correct horse battery'

async function tokenFor(email: string): Promise<string> {
  const res = await request(app).post('/api/v1/auth/register').send({ email, password: PASSWORD })
  return res.body.data.accessToken as string
}

const auth = (token: string): string => `Bearer ${token}`
const validBody = { url: 'https://example.com/read', title: 'Read me', tags: ['tech'] }

let token: string
beforeEach(async () => {
  token = await tokenFor(`bm-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`)
})

describe('auth required', () => {
  it('returns 401 without a token on POST and GET', async () => {
    const post = await request(app).post('/api/v1/bookmarks').send(validBody)
    expect(post.status).toBe(401)
    expect(post.body.error.code).toBe('UNAUTHORIZED')

    const get = await request(app).get('/api/v1/bookmarks')
    expect(get.status).toBe(401)
  })
})

describe('POST /api/v1/bookmarks', () => {
  it('returns 201 with the canonical envelope and status unread', async () => {
    const res = await request(app)
      .post('/api/v1/bookmarks')
      .set('Authorization', auth(token))
      .send(validBody)
    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.url).toBe(validBody.url)
    expect(res.body.data.status).toBe('unread')
    expect(res.body.meta).toHaveProperty('requestId')
  })

  it('returns 422 VALIDATION_ERROR for an invalid url or a missing title', async () => {
    const badUrl = await request(app)
      .post('/api/v1/bookmarks')
      .set('Authorization', auth(token))
      .send({ url: 'nope', title: 'x' })
    expect(badUrl.status).toBe(422)
    expect(badUrl.body.error.code).toBe('VALIDATION_ERROR')

    const noTitle = await request(app)
      .post('/api/v1/bookmarks')
      .set('Authorization', auth(token))
      .send({ url: 'https://example.com/x' })
    expect(noTitle.status).toBe(422)
  })
})

describe('GET /api/v1/bookmarks (list)', () => {
  it('paginates newest-first with a base64url nextCursor', async () => {
    const ids: string[] = []
    for (let i = 0; i < 3; i++) {
      const r = await request(app)
        .post('/api/v1/bookmarks')
        .set('Authorization', auth(token))
        .send({ url: `https://example.com/i${i}`, title: `i${i}` })
      ids.push(r.body.data.id as string)
    }
    const p1 = await request(app).get('/api/v1/bookmarks?limit=2').set('Authorization', auth(token))
    expect(p1.status).toBe(200)
    expect((p1.body.data.items as Array<{ id: string }>).map((r) => r.id)).toEqual([ids[2], ids[1]])
    expect(typeof p1.body.data.nextCursor).toBe('string')

    const p2 = await request(app)
      .get(
        `/api/v1/bookmarks?limit=2&cursor=${encodeURIComponent(p1.body.data.nextCursor as string)}`
      )
      .set('Authorization', auth(token))
    expect((p2.body.data.items as Array<{ id: string }>).map((r) => r.id)).toEqual([ids[0]])
    expect(p2.body.data.nextCursor).toBeNull()
  })

  it('filters by status and tag', async () => {
    const a = await request(app)
      .post('/api/v1/bookmarks')
      .set('Authorization', auth(token))
      .send({ url: 'https://example.com/w', title: 'w', tags: ['work'] })
    await request(app)
      .post('/api/v1/bookmarks')
      .set('Authorization', auth(token))
      .send({ url: 'https://example.com/h', title: 'h', tags: ['home'] })
    await request(app)
      .patch(`/api/v1/bookmarks/${a.body.data.id}`)
      .set('Authorization', auth(token))
      .send({ status: 'archived' })

    const byStatus = await request(app)
      .get('/api/v1/bookmarks?status=archived')
      .set('Authorization', auth(token))
    expect((byStatus.body.data.items as Array<{ id: string }>).map((r) => r.id)).toEqual([
      a.body.data.id,
    ])

    const byTag = await request(app)
      .get('/api/v1/bookmarks?tag=work')
      .set('Authorization', auth(token))
    expect((byTag.body.data.items as Array<{ id: string }>).map((r) => r.id)).toEqual([
      a.body.data.id,
    ])
  })

  it('returns 422 for an invalid status filter or a malformed cursor', async () => {
    const badStatus = await request(app)
      .get('/api/v1/bookmarks?status=bogus')
      .set('Authorization', auth(token))
    expect(badStatus.status).toBe(422)

    const badCursor = await request(app)
      .get('/api/v1/bookmarks?cursor=not-a-real-cursor')
      .set('Authorization', auth(token))
    expect(badCursor.status).toBe(422)
  })
})

describe('GET/PATCH/DELETE /api/v1/bookmarks/:id', () => {
  it('returns 404 for an unknown id', async () => {
    const res = await request(app)
      .get('/api/v1/bookmarks/00000000-0000-0000-0000-000000000000')
      .set('Authorization', auth(token))
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  it('PATCH updates status and 422s an invalid status', async () => {
    const created = await request(app)
      .post('/api/v1/bookmarks')
      .set('Authorization', auth(token))
      .send(validBody)
    const id = created.body.data.id as string

    const ok = await request(app)
      .patch(`/api/v1/bookmarks/${id}`)
      .set('Authorization', auth(token))
      .send({ status: 'reading' })
    expect(ok.status).toBe(200)
    expect(ok.body.data.status).toBe('reading')

    const bad = await request(app)
      .patch(`/api/v1/bookmarks/${id}`)
      .set('Authorization', auth(token))
      .send({ status: 'nope' })
    expect(bad.status).toBe(422)
  })

  it('DELETE soft-deletes: a subsequent GET is 404', async () => {
    const created = await request(app)
      .post('/api/v1/bookmarks')
      .set('Authorization', auth(token))
      .send(validBody)
    const id = created.body.data.id as string

    const del = await request(app)
      .delete(`/api/v1/bookmarks/${id}`)
      .set('Authorization', auth(token))
    expect(del.status).toBe(200)

    const get = await request(app).get(`/api/v1/bookmarks/${id}`).set('Authorization', auth(token))
    expect(get.status).toBe(404)
  })
})
