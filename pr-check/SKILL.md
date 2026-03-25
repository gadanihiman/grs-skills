---
name: pr-check
description: Technical checklist for backend PR self-review (NestJS/TypeScript) — B1–B21 static analysis + G1–G16 design patterns. Use when you want to run a checklist against a PR or piece of code. For the full review workflow with GitHub posting and Notion integration, use pr-review.
---

# PR Check — Backend Checklist

## Overview

Runs both checklists against the diff:

1. **Static Analysis (B1–B21)** — runtime bugs, logic errors, silent failures, test correctness
2. **Design Review (G1–G16)** — naming, complexity, documentation, test design, type precision

---

## Required Workflow

### Step 1: Understand the diff

Run `git diff main...HEAD` to see all changed files and understand the scope.

---

## Part 1 — Static Analysis (B1–B21)

### B1. Module Initialisation Timing
- Are any `const FOO = process.env.BAR` declarations at module top-level (outside a class)?
- Env vars must be read via `ConfigService` at runtime, not `process.env` at import time.

### B2. Silent Logic Bugs
- `||` chains between non-empty strings always resolve to the first operand — use `as const` array or union type.
- Optional fields (`field?: T`) used in comparisons like `field <= 0` silently return `false` when `undefined`.
- Check if reordering a `||` chain changed which value is evaluated first.

### B3. Unused Code
- Unused imports — especially after refactors.
- Variables assigned an initial value that is always overwritten before first read — declare without initial value.

### B4. Test Assertion No-Ops
- Search spec files for `.toHaveBeenCalled` without `()` — these silently pass always.
- Same for `.toBeDefined`, `.toBeTruthy`, `.toBeFalsy`, `.toBeNull` without `()`.

### B5. Flaky Tests from Random Data
- `faker` generating a value that can randomly match the hardcoded value being tested against.
- Use explicit hardcoded boundary values for mismatch tests.

### B6. Redundant Type Definitions
- New interfaces structurally identical to existing types — search before defining.

### B7. Wrong Test Title
- Test description says "X fails" but the mock actually simulates "Y fails".
- Test name and `mockRejectedValue` / `mockResolvedValue` must match.

### B8. Missing Critical Assertions
- Happy-path tests: are all side effects asserted (DB writes, status updates, service calls)?
- Guard/skip tests: are downstream methods asserted `.not.toHaveBeenCalled()`?

### B9. URL Path Construction
- Same path string used for both signature generation and the HTTP call?
- Base URL missing a required path prefix (e.g., `/api`)?

### B10. Status Mapper Completeness
- Does at least one external status map to each terminal internal state?
- Any value mapped to `null` or unhandled should log + Sentry, not silently disappear.

### B11. API Response Envelope Type Accuracy
- TypeScript type for each API response must match the actual envelope key from the API docs.
- Don't assume `{ data: [] }` — verify the actual key name for every endpoint.

### B12. Webhook Controller Must Not Swallow All Exceptions
- Blanket try-catch returning `200 OK` means failed webhooks are silently dropped.
- Unexpected exceptions should propagate or return 4xx/5xx.

### B13. No-Op Stubs Must Have No Side Effects
- A deferred/stub method must not still call `updateLastSync`, fire notifications, or write DB records.
- A true no-op: only a comment or `return`.

### B14. Duplicate Error Handling in Strategy and Caller
- If a method catches, logs, Sentries, and rethrows — the caller must NOT catch and log the same error again.

### B15. Enum Constants in Comparisons
- When a TypeScript enum exists for event types or status strings, use it — don't compare against string literals.

### B16. Dead Type Checks in Catch Blocks
- `instanceof AxiosError` in a DB/repository catch block will never be true — it's dead code.

### B17. Database Transactions for Multi-Step Writes
- Multiple sequential saves (2+) across entities must be wrapped in a TypeORM transaction.

### B18. Race Condition / TOCTOU on State Guards
- Check-then-act is not atomic — fix with atomic conditional update or `SELECT FOR UPDATE`.

### B19. Missing Null Check on `findOne()`
- `findOne()` returns `null` when no record matches — guard before use.
- Pattern: `if (!record) throw new NotFoundException('record not found');`

### B20. Credentials in Documentation Files
- Real API tokens in `.md` files are committed to git history permanently.
- Use clearly fake placeholders: `YOUR_BEARER_TOKEN_HERE`, `<api-token>`.

### B21. Input Normalization Consistency
- New flows must normalize user-provided strings (email, username) the same way as existing flows.

---

## Part 2 — Design Review (G1–G16)

### G1. Method Complexity
- Methods longer than ~40 lines with multiple concerns — extract to focused helpers.

### G2. Named Constants
- Magic strings for status/state values — check if constants already exist.

### G3. Naming Specificity
- Vague or mismatched names — method named for X that contains logic for Y.

### G4. Documentation
- New method similar to an existing one — explain the difference in a comment.
- New state transitions — update state machine or architecture docs.

### G5. Test Data Realism
- Numeric fields (price, quantity, dimensions) using `faker.string.alphanumeric()` instead of number generators.
- Currency fields using random strings instead of `faker.finance.currencyCode()`.

### G6. Test Naming Clarity
- Vague words: "completely", "properly", "correctly" without specifics.
- Preferred: `should <do something> when <condition>`.

### G7. No Real URLs or Credentials in Tests or Service Defaults
- All test URLs must be clearly dummy (`https://example.com`, `https://test.invalid`).
- No production-looking base URL hardcoded as a service default.

### G8. Test Assertion Completeness
- Crypto/signature operations: validate the output value, not just that the function ran.
- Retry/token-refresh flows: add a test for when the retry itself also fails.

### G9. `.env.example` Completeness
- All new env vars added to `.env.example` with a descriptive placeholder.

### G10. Type Precision
- `||` chains that should be `as const` arrays or union literal types.
- Optional fields that should be required.

### G11. Logical Grouping
- New types/constants placed in the section matching their domain.

### G12. Idempotency of External Calls in Retry Contexts
- In cron/retry-driven pushes: if the call succeeds externally but fails to record locally, the next retry creates a duplicate.

### G13. Log Level for Security Failures
- Failed HMAC validation, invalid auth → `error`, not `warn`.

### G14. Use Existing Helpers Consistently
- Before constructing a cache key or identifier inline, check if a helper already exists.

### G15. YAGNI — Avoid Implementing Unbuilt Features
- Constants or fields for features not yet built should be deferred.

### G16. Database Schema & Migration Quality
- Entity column decorators must match the actual DB type (`timestamptz`, `bigint`, `smallint`).
- Numeric columns for whole numbers: use `int`/`bigint`/`smallint`, not `float`/`decimal`.
- Migration `varchar` columns: specify explicit length where the domain has a known maximum.
- Column defaults must match nullable design.
- Index columns must match actual query patterns — UNIQUE index on lookup columns.

---

## Step 2: Report Findings

Group by part. For each issue:

```
[B1] path/to/file.ts:3
Severity: High
Issue: reads process.env at module-load time before ConfigModule bootstraps.
Fix: inject ConfigService, read inside method.

[G3] path/to/file.ts:42
Issue: method name is too vague — doesn't communicate what it does without reading the body.
Fix: rename to something that describes the actual behaviour.
```

## Step 3: Final Verdict

```
Static analysis:  X high, Y medium, Z low
Design review:    X blocking, Y nit

Overall: READY / NEEDS CHANGES
```

---

## Individual Skills

Run separately for a focused check:
- `pr-check-static` — B1–B21 static analysis only
- `pr-check-style` — G1–G16 design patterns only
- `pr-check-frontend` — F1–F16 React/Vue/Next.js/Tailwind
