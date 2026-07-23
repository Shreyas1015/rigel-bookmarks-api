# SPEC-002 — Bookmarks CRUD

**Status:** SHIPPED
**Created:** 2026-07-23
**Plan:** PLAN-002
**Epic:** Read-later
**Depends on:** SPEC-001

---

## Problem Statement
A read-later product is only useful once a signed-in person can actually save, find, and manage
the things they want to read later. SPEC-001 gave us accounts and a trustworthy per-request
identity; this spec adds the first owned resource — a **Bookmark** — scoped to its owner so that
one user can never see or touch another user's saved links.

---

## What We're Building
Owner-scoped CRUD for bookmarks under `/api/v1/bookmarks`. Every endpoint requires a valid access
token and operates only on rows owned by `req.auth.sub`. Bookmarks carry a URL, a title, an
optional note, a small tag set, and a reading `status`. Listing is cursor-paginated newest-first
with optional `status` / `tag` filters. Deletes are soft (paranoid) so a delete is recoverable and
a deleted row is invisible to every subsequent read. Cross-user access returns `404` (never `403`)
so the API never reveals that another user's resource exists.

---

## Core Entities
| Entity | Purpose |
|---|---|
| Bookmark | A saved link owned by a user. Becomes a Sequelize model + Zod schema. Fields: `id` (UUIDv7 PK), `userId` (FK → users), `url`, `title`, `note?`, `tags[]`, `status`, timestamps, `deletedAt` (paranoid). |

---

## API Endpoints
All endpoints are under `/api/v1/` and require `requireAuth`; every query is owner-scoped by the
authenticated user id.

- `POST   /api/v1/bookmarks` — create a bookmark; returns `201` with the created record.
- `GET    /api/v1/bookmarks` — list the caller's bookmarks, cursor-paginated on `(createdAt, id)`
  DESC; optional `?status=` and `?tag=` filters; optional `?cursor=` (base64url) and `?limit=`.
- `GET    /api/v1/bookmarks/:id` — fetch one owned bookmark; `404` if it is not the caller's.
- `PATCH  /api/v1/bookmarks/:id` — update `title` / `note` / `tags` / `status`; `404` if not owner.
- `DELETE /api/v1/bookmarks/:id` — soft-delete (paranoid); `404` if not owner.

---

## Business Rules
1. Every bookmark is owned by exactly one user (`userId`, FK → `users`, `ON DELETE CASCADE`). All
   reads and writes are scoped `where: { id, userId }` — a bookmark is invisible to non-owners.
2. A cross-user read/update/delete of another user's bookmark returns **404 NOT_FOUND**, never
   `403` — the API must not confirm that the resource exists.
3. `url` is required, must be a syntactically valid URL, and is at most **2048** characters.
4. `title` is required and is at most **512** characters.
5. `note` is optional free text.
6. `tags` is a string array; each tag is at most **50** characters and there are at most **20**
   tags. Absent tags default to `[]`.
7. `status` is one of `unread | reading | archived` and defaults to `unread` on create.
8. Invalid input (missing/invalid `url`, missing `title`, over-long fields, too many/over-long
   tags, unknown `status`) returns **422 VALIDATION_ERROR** and persists nothing.
9. Listing returns only the caller's non-deleted bookmarks, ordered newest-first
   (`createdAt DESC, id DESC`), cursor-paginated: the response `data` carries `items` plus a
   `nextCursor` (base64url) that is non-null only when more rows remain.
10. `DELETE` is a soft delete: the row's `deletedAt` is set, the row remains in the table, and it
    disappears from every later `GET`/list.
11. Every unauthenticated request to any bookmark endpoint returns **401 UNAUTHORIZED**.

---

## State Machine (if applicable)
`status` moves freely among the three states (no forbidden transitions in v1); the reading flow is:

```
unread → reading → archived
   ▲________________|   (a bookmark may also be re-opened: archived → reading/unread)
```

Any `status` value in the enum is an allowed target of a `PATCH`; unknown values are `422`.

---

## Non-Functional Requirements
- **Auth:** every endpoint requires `requireAuth`; owner scoping enforced in the repo layer
  (`where: { id, userId }`), never `findByPk` alone.
- **Pagination:** cursor-based on `(createdAt, id)` with base64url cursors; page size defaults to
  `DEFAULT_PAGE_SIZE` (20), capped at `MAX_PAGE_SIZE` (100).
- **Idempotency:** mutating routes accept the optional `Idempotency-Key` header (existing
  middleware).
- **Observability:** the bookmark service emits a structured log with `durationMs` on every
  boundary (`bookmark.*` events).
- **Indexes:** composite index on `(user_id, created_at, id)` for the list query; index on
  `user_id`; partial `WHERE deleted_at IS NULL` support via paranoid.
- **Coverage:** service ≥ 90%, repo ≥ 80%, routes ≥ 75% (harness thresholds).
- **Contract:** every route registered in `runtime/openapi.ts`; `docs/generated/openapi.*`
  regenerated.

---

## Out of Scope (v1)
- Full-text search, sorting other than newest-first, and offset/page pagination.
- Bulk operations (bulk create / delete / tag).
- Tag entities / tag management endpoints (tags are a denormalised string array here).
- Fetching / unfurling link metadata (title/description auto-population).
- Restoring soft-deleted bookmarks (the row is retained, but no un-delete endpoint yet).
- Sharing bookmarks between users.

---

## Acceptance Criteria
- [ ] **AC-1:** An authenticated `POST /api/v1/bookmarks` with a valid body returns `201` whose
  `data` envelope has an `id`, the submitted `url`, and `status: "unread"`.
- [ ] **AC-2:** `GET /api/v1/bookmarks` returns only the caller's bookmarks, newest-first, and is
  cursor-paginated: when more rows remain than the page limit, `data.nextCursor` is present
  (non-null) and following it returns the older rows.
- [ ] **AC-3:** A cross-user `GET` / `PATCH` / `DELETE` of another user's bookmark returns `404`
  with `error.code: "NOT_FOUND"` (isolation — never `403`).
- [ ] **AC-4:** `PATCH /api/v1/bookmarks/:id` transitions `status` `unread → reading → archived`
  and each change persists (a subsequent `GET` reflects the latest `status`).
- [ ] **AC-5:** `DELETE /api/v1/bookmarks/:id` soft-deletes: it returns success, a subsequent `GET`
  of that id returns `404`, and the row is still present in the table (paranoid — found with
  `paranoid: false`).
- [ ] **AC-6:** `POST /api/v1/bookmarks` with an invalid `url` or a missing `title` returns `422`
  with `error.code: "VALIDATION_ERROR"` and creates nothing.
- [ ] **AC-7:** An unauthenticated request to a bookmark endpoint returns `401` with
  `error.code: "UNAUTHORIZED"`.
