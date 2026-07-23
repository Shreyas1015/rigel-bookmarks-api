# Technical Debt Tracker

Debt is logged here immediately when created. Never ignored until it's a crisis.
Paid in small daily amounts.

---

## Severity

| Level | Meaning | Fix by |
|---|---|---|
| P0 | Security or data integrity risk | Immediately |
| P1 | Blocks future feature or causes recurring bugs | Within 2 sprints |
| P2 | Degrades quality or velocity | Within the quarter |
| P3 | Code smell, DX improvement | When in the area |

---

## Open Debt

| ID | Severity | Area | Description | Created By | Date |
|---|---|---|---|---|---|
| TD-001 | P2 | tests/architecture | The AST assertion checker imports the TypeScript compiler API (`import ts from 'typescript'` in `tests/architecture/assertion-integrity.test.ts`). The TS7 native (Go) compiler rewrite drops the JS API, so this test breaks under TS7. **Dormant:** ts-jest peer ranges + create-next-app pin scaffolds to TS5. **Trigger:** adopting TS7. **Affected:** `tests/architecture/assertion-integrity.test.ts`. | PLAN-006 AC-3 | 2026-07-20 |
| TD-002 | P2 | runtime/errorHandler | Validation status code is split across the app: the global `errorHandler` maps `ZodError → 400`, but `.claude/rules/testing.md`'s canonical route example and SPEC-002 AC-6 require **422**. F2's bookmark routes work around this per-route (`safeParse → ValidationError(422)`), so auth returns 400 and bookmarks 422 for the same class of failure. Unify the harness on one code (recommend 422 for semantic validation; ZodError→422 in `errorHandler`) and update SPEC-001's acceptance tests together. | PLAN-002 | 2026-07-23 |
| TD-003 | P3 | providers/redis | `src/providers/redis.ts` has 0% function coverage — its two inline callbacks (`retryStrategy`, the `on('error')` handler) are never exercised by tests, and they are awkward to unit-test because they are constructor-inline, not exported. The `./src/providers/` 70% threshold currently passes only because `jwt.ts`/`middleware.ts` (now 100%) carry the aggregate. Extract the callbacks or add a redis provider test if the aggregate ever dips. Pre-existing since F1 (which never ran `/garbage-collect`, so the threshold was never actually checked). | PLAN-002 | 2026-07-23 |

---

## Resolved Debt

| ID | Description | Resolved By | Date |
|---|---|---|---|
| *(none yet)* | — | — | — |
