/**
 * SPEC-002 AC-2 — list returns only the caller's bookmarks, newest-first, cursor-paginated:
 * a nextCursor is present when more rows remain, and following it returns the older rows.
 */
import request from 'supertest'
import { app } from '../../../src/runtime/app.js'

const uniqueEmail = (p: string): string =>
  `${p}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

async function authToken(): Promise<string> {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email: uniqueEmail('ac2'), password: 'correct horse battery' })
  return res.body.data.accessToken as string
}

describe("AC-2: list returns only the caller's bookmarks, newest-first, cursor-paginated", () => {
  it('AC-2: GET /api/v1/bookmarks paginates newest-first with a nextCursor when more remain', async () => {
    const token = await authToken()
    const created: string[] = []
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post('/api/v1/bookmarks')
        .set('Authorization', `Bearer ${token}`)
        .send({ url: `https://example.com/item-${i}`, title: `Item ${i}` })
      expect(res.status).toBe(201)
      created.push(res.body.data.id as string)
    }

    // created in order [0,1,2]; newest-first ⇒ [2,1,0]. Page 1 (limit 2) ⇒ [2,1] + a cursor.
    const page1 = await request(app)
      .get('/api/v1/bookmarks?limit=2')
      .set('Authorization', `Bearer ${token}`)
    expect(page1.status).toBe(200)
    const ids1 = (page1.body.data.items as Array<{ id: string }>).map((r) => r.id)
    expect(ids1).toEqual([created[2], created[1]])
    expect(page1.body.data.nextCursor).toBeTruthy()

    // Page 2 follows the cursor ⇒ the oldest remaining row [0].
    const cursor = page1.body.data.nextCursor as string
    const page2 = await request(app)
      .get(`/api/v1/bookmarks?limit=2&cursor=${encodeURIComponent(cursor)}`)
      .set('Authorization', `Bearer ${token}`)
    expect(page2.status).toBe(200)
    const ids2 = (page2.body.data.items as Array<{ id: string }>).map((r) => r.id)
    expect(ids2).toEqual([created[0]])
  })
})
