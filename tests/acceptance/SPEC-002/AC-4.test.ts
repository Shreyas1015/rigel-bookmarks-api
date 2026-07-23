/**
 * SPEC-002 AC-4 — PATCH status unread → reading → archived, and each change persists
 * (a subsequent GET reflects the latest status).
 */
import request from 'supertest'
import { app } from '../../../src/runtime/app.js'

const uniqueEmail = (p: string): string =>
  `${p}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

async function authToken(): Promise<string> {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email: uniqueEmail('ac4'), password: 'correct horse battery' })
  return res.body.data.accessToken as string
}

describe('AC-4: PATCH status unread → reading → archived persists', () => {
  it('AC-4: each PATCH of status persists and is reflected by a subsequent GET', async () => {
    const token = await authToken()
    const created = await request(app)
      .post('/api/v1/bookmarks')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.com/status-flow', title: 'Status flow' })
    expect(created.status).toBe(201)
    expect(created.body.data.status).toBe('unread')
    const id = created.body.data.id as string

    for (const status of ['reading', 'archived'] as const) {
      const patch = await request(app)
        .patch(`/api/v1/bookmarks/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status })
      expect(patch.status).toBe(200)
      expect(patch.body.data.status).toBe(status)

      const get = await request(app)
        .get(`/api/v1/bookmarks/${id}`)
        .set('Authorization', `Bearer ${token}`)
      expect(get.status).toBe(200)
      expect(get.body.data.status).toBe(status)
    }
  })
})
