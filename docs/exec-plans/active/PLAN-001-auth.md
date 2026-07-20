# PLAN-001 — Authentication & Accounts

**Status:** IN_PROGRESS
**Spec:** docs/product-specs/ready/SPEC-001-auth-accounts.md
**Created:** 2026-07-20
**Completed:** —

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
- [ ] **AC-1:** `POST /api/v1/auth/register` with a new email returns `201` with `data.accessToken` + `data.user` (id + email, no passwordHash) and sets an httpOnly `refresh_token` cookie.
- [ ] **AC-2:** duplicate email registration returns `409` `CONFLICT`.
- [ ] **AC-3:** invalid register body (bad email / password < 8) returns `400` `VALIDATION_ERROR`, no account created.
- [ ] **AC-4:** `login` with correct credentials returns `200` + `accessToken`; wrong password returns `401` `UNAUTHORIZED`.
- [ ] **AC-5:** `GET /api/v1/auth/me` is `401` without a token, `200` with the caller's id + email when authenticated.
- [ ] **AC-6:** `POST /api/v1/auth/refresh` returns `200` with a new `accessToken` from the httpOnly cookie, `401` without it.

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

---

## Decision Log

*(Filled during build)*

---

## Known Constraints
- **Boundaries:** services may not import providers, so JWT *minting* happens in the Runtime layer (the composition root wires providers); the service does password hashing (argon2) + user persistence and returns domain types.
- **Error taxonomy:** the scaffold's `errorHandler` only maps `ZodError → 400`. F1 introduces an `AppError` taxonomy (`ConflictError`/`UnauthorizedError`/`NotFoundError`) in `utils/errors.util.ts` and extends `errorHandler` to map it → status + envelope code.
- **Validation status code:** the scaffolded `errorHandler` maps `ZodError → 400` (not 422); acceptance/integration tests assert `400`.
- **Refresh cookie:** issued on register + login; `/refresh` reads it from the httpOnly cookie only. Cookie parsing is a small util (no cookie-parser dependency added).
- **DB schema for tests:** integration/acceptance suites run against a real Postgres (docker compose); schema created via the users migration / model sync.
