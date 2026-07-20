# ADR-000 — Infrastructure Foundation

- Status: Accepted
- Date: 2026-07-20
- Deciders: Platform / Phase 0 infra-setup

## Context

Phase 0 establishes the backend foundation for the Rigel express template before any
product feature is built. The stack must be layer-clean (ARCHITECTURE.md), observable, and
gate-enforceable from the first commit.

## Stack Decisions

### Express (HTTP framework)
Minimal, unopinionated, ubiquitous middleware ecosystem. The layered architecture keeps
business logic out of the framework, so a thin Express runtime is sufficient and avoids the
lock-in of heavier frameworks.

### Sequelize 6 + sequelize-typescript (ORM)
Decorator models give type-safe schema definitions. Pinned to Sequelize **6** because
`sequelize-typescript` v2 only supports v6 — an unpinned "latest" would resolve Sequelize 7
and break the decorator models. Dependabot moves the sequelize/sequelize-typescript/sequelize-cli
trio together.

### jose (JWT) — not jsonwebtoken
`jose` is standards-first, actively maintained, ESM-native, and supports the full JOSE suite.
It avoids the historical foot-guns of `jsonwebtoken` (algorithm confusion defaults). Tokens
carry a `jti`; revocation is a Redis denylist keyed by that `jti`.

### argon2 (password hashing) — not bcrypt
argon2id is the current OWASP-recommended memory-hard KDF. bcrypt is capped at 72 bytes and is
not memory-hard. (Installed as a dependency for the auth feature; no product auth built in Phase 0.)

### BullMQ + ioredis (background jobs)
BullMQ is the maintained successor to Bull, built on ioredis, with first-class TypeScript types
and reliable retry/backoff semantics. Redis is a shared dependency (rate-limit store, idempotency,
feature flags, revocation denylist), so BullMQ reuses existing infrastructure.

## Architecture Decisions

### Layered architecture (Types → Config → Models → Repo → Service → Runtime; Utils + Providers cross-cutting)
Enforced mechanically by `eslint-plugin-boundaries`, `madge --circular`, and
`tests/architecture/layers.test.ts`. A lower layer may never import a higher one. Providers are
wired in by Runtime (the composition root) only. The reusable observability helpers
(logger/tracing/metrics) live in **Config** — they use only the `@opentelemetry/api` global (a
no-op until the SDK boots), so Service/Repo can import them without importing the Providers layer.

### Zod validation at the repo boundary
Every row leaving the database is `Schema.parse(row.toJSON())` before it enters the domain, so a
schema drift or a bad migration fails loudly at the boundary rather than propagating untyped data.

### Cursor pagination (base64url)
Offset pagination degrades on large tables and is unstable under concurrent writes. All list
endpoints use opaque base64url cursors for stable, index-friendly pagination.

### Canonical response envelope
Success `{ ok: true, data, meta }` and error `{ ok: false, error: { code, message }, meta }` are
identical across the harness family (see `.claude/rules/api.md`) and generated into the OpenAPI
contract, so the frontend consumes one machine-readable source of truth.

## Consequences

- The gate (`npm run typecheck && lint && check:circular && test:arch && assert:tests`) is
  runnable and green from Phase 0 onward; feature layers tighten the same checks as they land.
- Observability is opt-in per environment: with `OTEL_EXPORTER_OTLP_ENDPOINT` unset the SDK
  fully no-ops (tests/CI), and the Config helpers still work against the API no-op.
