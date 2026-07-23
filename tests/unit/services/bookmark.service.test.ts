/**
 * Service tests — bookmark.service against a real Postgres (the harness has no ESM module-mock
 * story; exercising the real repo is simpler and higher-fidelity). Covers every branch:
 * create; get found + not-found + cross-user; list ordering + cursor + status/tag filters;
 * update status + empty-patch no-op + not-found + cross-user; remove + not-found + cross-user.
 * Requires the test DB (docker compose postgres) — outside the per-layer gate.
 */
import '../../integration/setup.js' // side-effect: sync schema (beforeAll) + truncate (beforeEach)
import * as authService from '../../../src/services/auth.service.js'
import * as bookmarkService from '../../../src/services/bookmark.service.js'
import { NotFoundError } from '../../../src/utils/errors.util.js'
import { newId } from '../../../src/utils/uuid.util.js'

let userId: string
let otherId: string

async function seedUser(email: string): Promise<string> {
  const u = await authService.register({ email, password: 'correct horse battery' })
  return u.id
}

beforeEach(async () => {
  userId = await seedUser(`svc-${newId()}@example.com`)
  otherId = await seedUser(`svc-other-${newId()}@example.com`)
})

const validInput = (
  over: Record<string, unknown> = {}
): {
  url: string
  title: string
  note?: string
  tags?: string[]
} => ({ url: 'https://example.com/a', title: 'A title', ...over })

describe('bookmarkService.create', () => {
  it('creates a bookmark owned by the user with default status "unread" and no deletedAt', async () => {
    const bm = await bookmarkService.create(userId, validInput({ tags: ['tech'] }))
    expect(typeof bm.id).toBe('string')
    expect(bm.userId).toBe(userId)
    expect(bm.status).toBe('unread')
    expect(bm.tags).toEqual(['tech'])
    expect(bm).not.toHaveProperty('deletedAt')
  })
})

describe('bookmarkService.get', () => {
  it('returns an owned bookmark', async () => {
    const bm = await bookmarkService.create(userId, validInput())
    const got = await bookmarkService.get(userId, bm.id)
    expect(got.id).toBe(bm.id)
  })

  it('throws NotFoundError for an unknown id', async () => {
    await expect(bookmarkService.get(userId, newId())).rejects.toBeInstanceOf(NotFoundError)
  })

  it("throws NotFoundError for another user's bookmark (isolation)", async () => {
    const bm = await bookmarkService.create(userId, validInput())
    await expect(bookmarkService.get(otherId, bm.id)).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('bookmarkService.list', () => {
  it('returns the caller rows newest-first and cursor-paginates', async () => {
    const ids: string[] = []
    for (let i = 0; i < 3; i++) {
      const bm = await bookmarkService.create(userId, validInput({ title: `t${i}` }))
      ids.push(bm.id)
    }
    const page1 = await bookmarkService.list(userId, { limit: 2 })
    expect(page1.items.map((r) => r.id)).toEqual([ids[2], ids[1]])
    expect(page1.hasMore).toBe(true)
    expect(page1.nextCursor).not.toBeNull()

    const page2 = await bookmarkService.list(userId, { limit: 2, cursor: page1.nextCursor! })
    expect(page2.items.map((r) => r.id)).toEqual([ids[0]])
    expect(page2.hasMore).toBe(false)
    expect(page2.nextCursor).toBeNull()
  })

  it('filters by status and by tag', async () => {
    const a = await bookmarkService.create(userId, validInput({ tags: ['work'] }))
    await bookmarkService.create(userId, validInput({ tags: ['home'] }))
    await bookmarkService.update(userId, a.id, { status: 'archived' })

    const archived = await bookmarkService.list(userId, { filter: { status: 'archived' } })
    expect(archived.items.map((r) => r.id)).toEqual([a.id])

    const tagged = await bookmarkService.list(userId, { filter: { tag: 'work' } })
    expect(tagged.items.map((r) => r.id)).toEqual([a.id])
  })

  it('excludes other users’ bookmarks', async () => {
    await bookmarkService.create(otherId, validInput())
    const mine = await bookmarkService.list(userId, {})
    expect(mine.items).toHaveLength(0)
  })
})

describe('bookmarkService.update', () => {
  it('transitions status and persists it', async () => {
    const bm = await bookmarkService.create(userId, validInput())
    const reading = await bookmarkService.update(userId, bm.id, { status: 'reading' })
    expect(reading.status).toBe('reading')
    const archived = await bookmarkService.update(userId, bm.id, { status: 'archived' })
    expect(archived.status).toBe('archived')
    expect((await bookmarkService.get(userId, bm.id)).status).toBe('archived')
  })

  it('updates title/note/tags', async () => {
    const bm = await bookmarkService.create(userId, validInput())
    const upd = await bookmarkService.update(userId, bm.id, {
      title: 'new',
      note: 'a note',
      tags: ['x', 'y'],
    })
    expect(upd.title).toBe('new')
    expect(upd.note).toBe('a note')
    expect(upd.tags).toEqual(['x', 'y'])
  })

  it('returns the current row unchanged for an empty patch', async () => {
    const bm = await bookmarkService.create(userId, validInput())
    const same = await bookmarkService.update(userId, bm.id, {})
    expect(same.id).toBe(bm.id)
    expect(same.status).toBe('unread')
  })

  it('throws NotFoundError for an unknown id (non-empty patch)', async () => {
    await expect(
      bookmarkService.update(userId, newId(), { status: 'reading' })
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('throws NotFoundError for an empty patch on an unknown id', async () => {
    await expect(bookmarkService.update(userId, newId(), {})).rejects.toBeInstanceOf(NotFoundError)
  })

  it("throws NotFoundError updating another user's bookmark (isolation)", async () => {
    const bm = await bookmarkService.create(userId, validInput())
    await expect(
      bookmarkService.update(otherId, bm.id, { status: 'reading' })
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('bookmarkService.remove', () => {
  it('soft-deletes so a subsequent get is NotFoundError', async () => {
    const bm = await bookmarkService.create(userId, validInput())
    await expect(bookmarkService.remove(userId, bm.id)).resolves.toBeUndefined()
    await expect(bookmarkService.get(userId, bm.id)).rejects.toBeInstanceOf(NotFoundError)
  })

  it('throws NotFoundError for an unknown id', async () => {
    await expect(bookmarkService.remove(userId, newId())).rejects.toBeInstanceOf(NotFoundError)
  })

  it("throws NotFoundError deleting another user's bookmark (isolation)", async () => {
    const bm = await bookmarkService.create(userId, validInput())
    await expect(bookmarkService.remove(otherId, bm.id)).rejects.toBeInstanceOf(NotFoundError)
  })
})
