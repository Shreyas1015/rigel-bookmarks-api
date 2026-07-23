/**
 * SPEC-002 AC-6 — invalid input is a 422 VALIDATION_ERROR and persists nothing: an invalid url
 * or a missing title is rejected, and the caller's list stays empty.
 */
import request from 'supertest'
import { app } from '../../../src/runtime/app.js'

const uniqueEmail = (p: string): string =>
  `${p}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

async function authToken(): Promise<string> {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email: uniqueEmail('ac6'), password: 'correct horse battery' })
  return res.body.data.accessToken as string
}

describe('AC-6: invalid input is 422 VALIDATION_ERROR', () => {
  it('AC-6: an invalid url or a missing title returns 422 and creates nothing', async () => {
    const token = await authToken()

    const badUrl = await request(app)
      .post('/api/v1/bookmarks')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'not-a-valid-url', title: 'Has a title' })
    expect(badUrl.status).toBe(422)
    expect(badUrl.body.error.code).toBe('VALIDATION_ERROR')

    const noTitle = await request(app)
      .post('/api/v1/bookmarks')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.com/valid' })
    expect(noTitle.status).toBe(422)
    expect(noTitle.body.error.code).toBe('VALIDATION_ERROR')

    const list = await request(app).get('/api/v1/bookmarks').set('Authorization', `Bearer ${token}`)
    expect(list.status).toBe(200)
    expect((list.body.data.items as unknown[]).length).toBe(0)
  })
})
