/**
 * SPEC-002 AC-7 — an unauthenticated request to a bookmark endpoint is 401 UNAUTHORIZED.
 */
import request from 'supertest'
import { app } from '../../../src/runtime/app.js'

describe('AC-7: unauthenticated requests are 401', () => {
  it('AC-7: POST and GET /api/v1/bookmarks without a token return 401 UNAUTHORIZED', async () => {
    const post = await request(app)
      .post('/api/v1/bookmarks')
      .send({ url: 'https://example.com/x', title: 'x' })
    expect(post.status).toBe(401)
    expect(post.body.error.code).toBe('UNAUTHORIZED')

    const get = await request(app).get('/api/v1/bookmarks')
    expect(get.status).toBe(401)
    expect(get.body.error.code).toBe('UNAUTHORIZED')
  })
})
