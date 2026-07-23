# PLAN-002 — Bookmarks CRUD

**Status:** IN_PROGRESS
**Spec:** docs/product-specs/ready/SPEC-002-bookmarks.md
**Created:** 2026-07-23
**Completed:** —

---

## Goal
Deliver the first owned resource: owner-scoped Bookmarks CRUD under `/api/v1/bookmarks` with
cursor pagination, soft delete (paranoid), status enum, and cross-user 404 isolation.

---

## Layer Build Order

Build order — each row is a layer; `/build-layer` builds the first `[ ]` row, gates it, commits,
then ticks it to `[x]`. (No Config layer: pagination bounds already live in `config/constants.ts`;
domain field limits + the status enum live in the Types Zod schema, which may not import Config.
No Workers layer: no background jobs.)

| # | Layer | Files | Gate Focuses On |
|---|---|---|---|
| 1 | `[x]` Types | `src/types/bookmark.types.ts`, `src/types/common.types.ts` | Zero imports, zero logic; Zod schemas (Bookmark, Create/Update, status enum, tag/url/title limits) |
| 2 | `[x]` Models | `src/models/Bookmark.model.ts`, register in `src/models/index.ts` | paranoid, UUIDv7 default, userId FK, composite `(user_id, created_at, id)` index |
| 3 | `[x]` Migrations | `db/migrations/20260723000001-create-bookmarks.cjs` | `.cjs`; runs clean; FK ON DELETE CASCADE; both up() + down(); indexes |
| 4 | `[x]` Repo | `src/repo/bookmark.repo.ts`, `src/repo/index.ts`, `tests/integration/bookmark.isolation.test.ts` | Zod parse every result; cursor pagination (Op.lt createdAt+id); owner-scoped `where:{id,userId}`; no findByPk-alone |
| 5 | `[ ]` Service | `src/services/bookmark.service.ts` | No express import; owner scoping; NotFound on cross-user; ≥90% coverage; boundary logs |
| 6 | `[ ]` Runtime | `src/runtime/routes/v1/bookmarks.route.ts`, mount in `src/runtime/app.ts`, register in `src/runtime/openapi.ts` | requireAuth first; validate→service→envelope; 422 on invalid; idempotency; cursor query; OpenAPI registered |
| 7 | `[ ]` Tests | `tests/unit/services/bookmark.service.test.ts`, `tests/integration/bookmarks.test.ts`, `tests/integration/bookmark.isolation.test.ts` | Coverage gates; isolation test present; SPEC-002 acceptance suite green |

---

## Acceptance Criteria
{Copied from SPEC-002 — graded green by `npm run gate:final` / `ac:vector` at completion.}
- [ ] **AC-1:** authed `POST /api/v1/bookmarks` (valid body) → `201` with `id`, submitted `url`, `status:"unread"`.
- [ ] **AC-2:** `GET /api/v1/bookmarks` → only the caller's bookmarks, newest-first, cursor-paginated (`nextCursor` present when more remain).
- [ ] **AC-3:** cross-user `GET`/`PATCH`/`DELETE` of another user's bookmark → `404` `NOT_FOUND` (never 403).
- [ ] **AC-4:** `PATCH :id` transitions `status` unread→reading→archived and each change persists.
- [ ] **AC-5:** `DELETE :id` soft-deletes: subsequent `GET` → `404`, row still present (paranoid).
- [ ] **AC-6:** `POST` with invalid `url` or missing `title` → `422` `VALIDATION_ERROR`, nothing created.
- [ ] **AC-7:** unauthenticated request → `401` `UNAUTHORIZED`.

---

## Progress Log

### 2026-07-23 — Plan created
- Spec SPEC-002 confirmed READY; acceptance tests red-recorded (.rigel/redgreen/SPEC-002.json, 7 AC red).
- 7 layers planned (Config + Workers dropped). First owned resource → a cross-user isolation test is required.
- Cut feature branch `feat/PLAN-002-bookmarks` from `main` per `.rigel/git-policy.json`.

---

## Decision Log

*(Filled during build)*

---

## Known Constraints
- **Validation status code (422 vs 400):** the scaffold's `errorHandler` maps `ZodError → 400`, but
  SPEC-002 AC-6 (and `.claude/rules/testing.md`'s canonical route example) require **422** for
  invalid input. The bookmark routes therefore validate with `safeParse` and throw a
  `ValidationError (422, VALIDATION_ERROR)` rather than letting the ZodError reach the global
  400 handler — keeping F1's auth 400 behavior intact.
- **Owner scoping:** the repo enforces `where: { id, userId }` on every single-row read/update/delete;
  a non-owner (or missing) row yields `null` → service throws `NotFoundError` → 404 (never 403).
- **Cursor pagination:** base64url cursor over `(createdAt, id)` DESC, `Op.lt` keyset; page size from
  `config/constants.ts` (`DEFAULT_PAGE_SIZE` 20 / `MAX_PAGE_SIZE` 100).
