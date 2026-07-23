/**
 * SPEC-002 AC-5 — DELETE soft-deletes (paranoid): it succeeds, a subsequent GET of that id is
 * 404, and the row is still present in the table with deleted_at set (found via raw SQL, which
 * ignores the paranoid scope).
 */
import request from 'supertest'
import { QueryTypes } from 'sequelize'
import { app } from '../../../src/runtime/app.js'
import { sequelize } from '../../../src/models/index.js'

const uniqueEmail = (p: string): string =>
  `${p}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

async function authToken(): Promise<string> {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email: uniqueEmail('ac5'), password: 'correct horse battery' })
  return res.body.data.accessToken as string
}

describe('AC-5: DELETE soft-deletes (paranoid)', () => {
  it('AC-5: after DELETE the GET is 404 but the row is retained with deleted_at set', async () => {
    const token = await authToken()
    const created = await request(app)
      .post('/api/v1/bookmarks')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.com/to-delete', title: 'To delete' })
    expect(created.status).toBe(201)
    const id = created.body.data.id as string

    const del = await request(app)
      .delete(`/api/v1/bookmarks/${id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(del.status).toBeGreaterThanOrEqual(200)
    expect(del.status).toBeLessThan(300)

    const get = await request(app)
      .get(`/api/v1/bookmarks/${id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(get.status).toBe(404)

    const rows = (await sequelize.query('SELECT id, deleted_at FROM bookmarks WHERE id = :id', {
      replacements: { id },
      type: QueryTypes.SELECT,
    })) as Array<{ id: string; deleted_at: string | null }>
    expect(rows).toHaveLength(1)
    expect(rows[0]!.deleted_at).not.toBeNull()
  })
})
