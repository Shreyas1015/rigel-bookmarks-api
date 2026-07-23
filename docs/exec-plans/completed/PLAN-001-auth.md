# PLAN-001 — Authentication & Accounts

**Status:** COMPLETE
**Spec:** docs/product-specs/ready/SPEC-001-auth-accounts.md
**Created:** 2026-07-20
**Completed:** 2026-07-20

---

## Goal
Deliver the ownership foundation: email/password accounts (argon2), access-token-in-body +
httpOnly refresh cookie, and a `requireAuth` auth context every later feature scopes by.

---

## Layer Build Order

| # | Layer | Files | Gate Focuses On |
|---|---|---|---|
| 1 | Types | `src/types/user.types.ts`, `src/types/auth.types.ts` | Zero imports, zero logic; Zod schemas |
| 2 | Foundation (Config + Utils) | `src/config/constants.ts` (auth consts), `src/utils/errors.util.ts` (domain error taxonomy), `src/utils/cookie.util.ts` | process.env only in env.ts; utils 100% cover, type-only Types import |
| 3 | Models | `src/models/User.model.ts`, register in `src/models/index.ts` | paranoid, UUIDv7 default, unique email index |
| 4 | Migrations | `db/migrations/<ts>-create-users.js` | Runs clean, has down(), unique index |
| 5 | Repo | `src/repo/user.repo.ts`, `src/repo/index.ts` | Zod parse every result, no business logic, email lookup |
| 6 | Service | `src/services/auth.service.ts` | No express import; argon2 hash/verify; ≥90% coverage; boundary logs |
| 7 | Runtime | `src/providers/auth/jwt.ts` (add refresh sign/verify), `src/runtime/routes/v1/auth.route.ts`, mount in `src/runtime/app.ts`, register in `src/runtime/openapi.ts` | Auth-first, envelope, authLimiter, httpOnly cookie, OpenAPI registered |
| 8 | Tests | `tests/unit/utils/*`, `tests/unit/services/auth.service.test.ts`, `tests/integration/auth.test.ts` | Coverage gates; acceptance suite (SPEC-001) green |

*(Workers row removed — no background jobs in F1. No isolation test — a User is not owned by another user; the first owned resource arrives in F2/bookmarks.)*

---

## Acceptance Criteria
{Copied from SPEC-001 — graded green by `npm run gate:final` / `ac:vector` at completion.}
- [x] **AC-1:** `POST /api/v1/auth/register` with a new email returns `201` with `data.accessToken` + `data.user` (id + email, no passwordHash) and sets an httpOnly `refresh_token` cookie.
- [x] **AC-2:** duplicate email registration returns `409` `CONFLICT`.
- [x] **AC-3:** invalid register body (bad email / password < 8) returns `400` `VALIDATION_ERROR`, no account created.
- [x] **AC-4:** `login` with correct credentials returns `200` + `accessToken`; wrong password returns `401` `UNAUTHORIZED`.
- [x] **AC-5:** `GET /api/v1/auth/me` is `401` without a token, `200` with the caller's id + email when authenticated.
- [x] **AC-6:** `POST /api/v1/auth/refresh` returns `200` with a new `accessToken` from the httpOnly cookie, `401` without it.

---

## Progress Log

### 2026-07-20 — Plan created
- Spec SPEC-001 confirmed READY; acceptance tests red-recorded (.rigel/redgreen/SPEC-001.json).
- 8 layers planned (Workers dropped; no cross-user isolation test — no owned resource yet).
- Cut feature branch `feat/PLAN-001-auth` from `main` per `.rigel/git-policy.json`.

### 2026-07-20 — Layer 1 (Types) — gate GREEN
- `src/types/user.types.ts` (User/PublicUser/CreateUserInput + Zod), `src/types/auth.types.ts` (Register/Login schemas, AuthResponse).
- Gate: typecheck/lint/circular/arch/assert all pass; traceability now active (10 arch tests, no skips).

### 2026-07-20 — Layer 2 (Foundation: Config + Utils) — gate GREEN
- `src/config/constants.ts`: REFRESH_COOKIE_NAME, DEFAULT_USER_ROLES.
- `src/utils/errors.util.ts`: AppError + ConflictError/UnauthorizedError/NotFoundError.
- `src/utils/cookie.util.ts`: parseCookies (no cookie-parser dependency).

### 2026-07-20 — Layer 3 (Models) — gate GREEN
- `src/models/User.model.ts`: paranoid, UUIDv7 default, unique email index, roles ARRAY default ['user'].
- Registered in `src/models/index.ts` via `sequelize.addModels([User])`.

### 2026-07-20 — Layer 4 (Migrations) — gate GREEN + logic validated on live PG
- `db/migrations/20260720000001-create-users.js`: createTable + unique email index; down() drops.
- Validated up/down/up against docker Postgres (columns + indexes correct). NOTE: `npm run db:migrate`
  is broken in the scaffold (sequelize-cli can't load the TS `.sequelizerc` config; `.js` + module.exports
  clashes with `"type":"module"`) — validated programmatically via createRequire instead. See bug log.

### 2026-07-20 — Layer 5 (Repo) — gate GREEN
- `src/repo/user.repo.ts`: create / findByEmail / findById, each `UserSchema.parse(row.toJSON())`.
- `src/repo/index.ts`: `export * as userRepo`. No owner-scoped tokens -> no isolation test required.

### 2026-07-20 — Layer 6 (Service) — gate GREEN
- `src/services/auth.service.ts`: register (argon2 hash, duplicate-email -> ConflictError), login
  (argon2 verify, 401 on bad creds, no user enumeration), getById; withSpan + logger.info per boundary.
- Fix: argon2's shipped types declare `hash()` as `Promise<any>` -> typed the result at the boundary
  so `no-unsafe-assignment` stays satisfied (verify() is correctly typed). Import as `* as argon2`.

---

## Decision Log

### Decision: JWT minting in Runtime, hashing in Service
**Context:** ESLint boundaries forbid `services -> providers`, so the service cannot call the jwt provider.
**Chosen:** Service owns argon2 hashing + persistence and returns `PublicUser`; the route (composition root) mints access + refresh tokens via `providers/auth/jwt`.
**Trade-offs:** Token concerns live in the route, but that is exactly what the composition root is for; the service stays HTTP/token-agnostic and unit-testable without providers.

### Decision: errorHandler maps a domain AppError taxonomy
**Context:** The scaffold's errorHandler only mapped ZodError->400, everything else->500; auth needs 409/401/404.
**Chosen:** Introduced `utils/errors.util.ts` (AppError + Conflict/Unauthorized/NotFound) and extended errorHandler to map `AppError` -> its status + envelope code.

### Decision: OpenAPI paths registered in openapi.ts, not route files
**Context:** `scripts/openapi.export.ts` imports only `src/runtime/openapi.ts`; route-file `registerPath` calls never run (0 paths), and importing routes from openapi.ts would be circular.
**Chosen:** Register all paths in `openapi.ts` (imports Zod schemas from Types). See bug log — the api.md rule shows route-file registration, which does not work with the exporter.

### 2026-07-20 — Layer 7 (Runtime) — gate GREEN
- `providers/auth/jwt.ts`: added signRefreshToken / verifyRefreshToken (typ:'refresh', denylist-aware).
- `runtime/routes/v1/auth.route.ts`: register/login/refresh/me (authLimiter, httpOnly refresh cookie).
- `runtime/middleware/errorHandler.ts`: map AppError. `runtime/app.ts`: mount at /api/v1/auth.
- `runtime/openapi.ts`: 4 auth paths; `npm run openapi:export` -> 4 paths written + committed.

### 2026-07-20 — Layer 8 (Tests) — gate GREEN + gate:final AC vector all PASS
- Unit: `tests/unit/utils/errors.util.test.ts`, `cookie.util.test.ts` (100% utils); DB-backed
  `tests/unit/services/auth.service.test.ts` (all service branches).
- Integration: `tests/integration/auth.test.ts` (HTTP contract, envelope, httpOnly cookie, requireAuth).
- `npm run gate:final` -> AC-1..AC-6 all PASS (acceptance suite green against docker Postgres/Redis).
- Fixes needed to make the app's own suite runnable (see bug log):
  1. Rate limiter now skips under NODE_ENV=test (authLimiter 10/min would 429 the acceptance suite).
  2. Repo imports the model via `models/index.js` barrel so `addModels` runs (else "Model not initialized").
  3. jest `maxWorkers: 1` + `forceExit: true` (single shared DB; app owns a non-closable redis singleton).
- **Boundaries:** services may not import providers, so JWT *minting* happens in the Runtime layer (the composition root wires providers); the service does password hashing (argon2) + user persistence and returns domain types.
- **Error taxonomy:** the scaffold's `errorHandler` only maps `ZodError → 400`. F1 introduces an `AppError` taxonomy (`ConflictError`/`UnauthorizedError`/`NotFoundError`) in `utils/errors.util.ts` and extends `errorHandler` to map it → status + envelope code.
- **Validation status code:** the scaffolded `errorHandler` maps `ZodError → 400` (not 422); acceptance/integration tests assert `400`.
- **Refresh cookie:** issued on register + login; `/refresh` reads it from the httpOnly cookie only. Cookie parsing is a small util (no cookie-parser dependency added).
- **DB schema for tests:** integration/acceptance suites run against a real Postgres (docker compose); schema created via the users migration / model sync.

### AC vector — SPEC-001 — 2026-07-20T16:13:09.274Z
- AC-1: PASS ✅
- AC-2: PASS ✅
- AC-3: PASS ✅
- AC-4: PASS ✅
- AC-5: PASS ✅
- AC-6: PASS ✅
