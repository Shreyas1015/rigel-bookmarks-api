# SPEC-001 — Authentication & Accounts

**Status:** READY
**Created:** 2026-07-20
**Plan:** PLAN-001
**Epic:** Identity
**Depends on:** —

---

## Problem Statement
A read-later / bookmark saver is worthless without a notion of "who owns what". Before any
bookmark can be saved, the product needs accounts: a way for a person to register, prove who they
are on later requests, and give every subsequent feature a trustworthy per-user identity to scope
data by. This spec builds that ownership foundation.

---

## What We're Building
Email + password accounts with argon2-hashed credentials, stateless JWT access tokens returned in
the response body, and a long-lived refresh token delivered as an httpOnly cookie. A `requireAuth`
middleware turns a valid access token into a request-scoped auth context (`req.auth`) that every
later feature uses to enforce per-user ownership. This is the identity layer only — no bookmarks.

---

## Core Entities
| Entity | Purpose |
|---|---|
| User | An account: unique email, argon2 password hash, roles. Becomes a Sequelize model + Zod schema. The owner every future resource is scoped to. |

---

## API Endpoints
- `POST /api/v1/auth/register` — create an account; returns `{ accessToken, user }` (201) and sets the refresh-token cookie.
- `POST /api/v1/auth/login` — authenticate; returns `{ accessToken, user }` (200) and sets the refresh-token cookie.
- `POST /api/v1/auth/refresh` — exchange the httpOnly refresh cookie for a fresh access token (200).
- `GET  /api/v1/auth/me` — return the authenticated caller's account (200); requires `requireAuth`.

---

## Business Rules
1. Email is unique across all (non-deleted) users; a second registration with the same email is a `409 CONFLICT`.
2. Passwords are stored only as argon2 hashes — the plaintext is never persisted, logged, or returned.
3. A password must be at least 8 characters; email must be a syntactically valid email. Violations are `400 VALIDATION_ERROR`.
4. `register` and `login` both return a short-lived access token (JWT) in the response body and set the refresh token as an httpOnly, SameSite=strict cookie — never in the body.
5. The access token carries the user id as `sub` and the user's roles; `requireAuth` verifies it and populates `req.auth`, else `401 UNAUTHORIZED`.
6. `refresh` reads the refresh token only from the httpOnly cookie (never the body/query); a missing or invalid refresh cookie is `401 UNAUTHORIZED`.
7. No response ever includes the password hash. `user` payloads expose `{ id, email, roles, createdAt }` only.
8. New accounts are created with the default role set `['user']`.

---

## State Machine (if applicable)
Not applicable — a User has no lifecycle state machine in this spec (soft-delete via `paranoid` only).

---

## Non-Functional Requirements
- **Auth endpoints are rate-limited** with the strict auth tier (brute-force defence) — `authLimiter`.
- **Password hashing:** argon2 (argon2id defaults).
- **Tokens:** access token TTL from `JWT_ACCESS_EXPIRY_SECONDS`; refresh TTL from `JWT_REFRESH_EXPIRY_SECONDS`. HS256 via the existing `providers/auth/jwt` provider.
- **Observability:** the auth service emits a structured log on register/login/refresh boundaries (`auth.*` events) with `durationMs`; credentials never appear in logs.
- **Coverage:** service ≥ 90%, repo ≥ 80%, routes ≥ 75%, utils 100% (harness thresholds).
- **Contract:** every route registered in `runtime/openapi.ts`; `docs/generated/openapi.*` regenerated.

---

## Out of Scope (v1)
- Bookmarks and any owned resource CRUD (that is the next spec, F2).
- Logout / refresh-token revocation & rotation reuse-detection (the jwt denylist exists; wiring a logout endpoint is deferred).
- Email verification, password reset, OAuth / social login, MFA.
- Role management endpoints (roles default to `['user']`; RBAC guard already exists as a provider).

---

## Acceptance Criteria
- [ ] **AC-1:** `POST /api/v1/auth/register` with a new email returns `201` whose `data` contains an `accessToken` and a `user` with `id` + `email` (and no `passwordHash`), and sets an httpOnly `refresh_token` cookie.
- [ ] **AC-2:** `POST /api/v1/auth/register` with an email that is already registered returns `409` with `error.code = "CONFLICT"`.
- [ ] **AC-3:** `POST /api/v1/auth/register` with an invalid body (malformed email or a password shorter than 8 chars) returns `400` with `error.code = "VALIDATION_ERROR"` and does not create an account.
- [ ] **AC-4:** `POST /api/v1/auth/login` with correct credentials returns `200` with an `accessToken`, and with a wrong password returns `401` with `error.code = "UNAUTHORIZED"`.
- [ ] **AC-5:** `GET /api/v1/auth/me` returns `401` without a bearer token and returns `200` with the caller's own `id` + `email` when given a valid access token.
- [ ] **AC-6:** `POST /api/v1/auth/refresh` returns `200` with a new `accessToken` when sent the httpOnly `refresh_token` cookie from login, and returns `401` when the cookie is absent.
