# QUALITY_SCORE.md — Domain Health Grades

Updated by `/garbage-collect` after every feature.

---

## Grading Rubric

Coverage is judged **per layer** against the thresholds in `jest.config.ts`
(utils 100% · services 90% · repo 80% · routes 75% · providers 70%), never as a single
global number — that is what CI enforces.

| Grade | Meaning |
|---|---|
| A | All invariants met, **every per-layer coverage threshold met**, zero known debt |
| B | Minor issues, per-layer thresholds met with little margin, low-priority debt logged |
| C | Layer violation OR any per-layer threshold breached OR unresolved medium debt |
| D | Multiple violations, coverage well under thresholds, active bugs |
| F | Blocking issues, data integrity risk, security concern |

---

## Architecture Health

| Check | Status |
|---|---|
| No cross-layer imports (eslint boundaries) | ✅ (PLAN-002) |
| Cross-user isolation test per owned resource | ✅ `bookmark.isolation.test.ts` |
| No circular imports (madge) | ✅ |
| No files > 400 lines | ✅ (largest src 143) |
| No process.env outside Config | ✅ |
| No console.log in src/ | ✅ |
| OpenAPI contract in sync (openapi:export clean) | ✅ 6 paths |
| Utils: 100% test coverage | ✅ |

Run `/layer-check` to update this table.

---

## Domain Grades

| Domain | Grade | Coverage | Last Updated | Notes |
|---|---|---|---|---|
| Bookmarks | A | repo 100% · service 100% · route ~98% (br 96.7%) | 2026-07-23 (PLAN-002) | Owner-scoped CRUD; cursor pagination; paranoid soft delete; cross-user 404 isolation test; all 7 SPEC-002 ACs PASS. |

---

## Domain Grade Template

Copy this block for each new domain:

```
### {Domain Name}
**Grade:** —
**Coverage:** —%
**Last Updated:** YYYY-MM-DD (PLAN-XXX)

Passing:
- [ ] No layer violations
- [ ] Zod parse on all repo boundaries
- [ ] Structured logging on all service methods
- [ ] OTel spans on all service boundaries

Issues:
- none
```
