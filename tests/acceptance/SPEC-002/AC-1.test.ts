/**
 * SPEC-002 AC-1 — an authenticated create returns 201 with the created bookmark
 * (id + submitted url + default status "unread"). Red until the bookmarks routes land.
 */
import request from 'supertest'
import { app } from '../../../src/runtime/app.js'

const uniqueEmail = (p: string): string =>
  `${p}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

async function authToken(): Promise<string> {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email: uniqueEmail('ac1'), password: 'correct horse battery' })
  return res.body.data.accessToken as string
}

describe('AC-1: authed create returns 201 with the created bookmark', () => {
  it('AC-1: POST /api/v1/bookmarks returns 201 with id, url and status "unread"', async () => {
    const token = await authToken()
    const url = 'https://example.com/read-later-article'
    const res = await request(app)
      .post('/api/v1/bookmarks')
      .set('Authorization', `Bearer ${token}`)
      .send({ url, title: 'A great read', tags: ['tech'] })

    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(typeof res.body.data.id).toBe('string')
    expect(res.body.data.url).toBe(url)
    expect(res.body.data.status).toBe('unread')
  })
})
