---
name: pr-review
description: Full pre-submission backend PR self-review (NestJS/TypeScript) combining static analysis and human reviewer patterns. Use when user says "full PR review", "pre-submit review", "review before pushing", or wants a complete backend check. For frontend PRs use pr-review-frontend instead.
---

# PR Review — Full Pre-Submission Check

## Overview

Runs both reviewer checklists before submitting a PR:

1. **Static Analysis** — runtime bugs, logic errors, unused code, test correctness
2. **Human Reviewer** — naming, complexity, documentation, test design, type precision

Run in this order: fix bugs first (Static Analysis), then address design/style (Human Reviewer).

---

## Required Workflow

### Step 1: Understand the diff

Run `git diff main...HEAD` to see all changed files and understand the scope.

---

## Part 1 — Static Analysis Checklist (Runtime & Logic)

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
- Use explicit hardcoded boundary values (e.g., `'NOT_DEFAULT'`) instead of `faker.location.countryCode()` for mismatch tests.

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
- Tests that mock `.mockReturnValue('completed')` can hide a wrong real mapping — check the actual function.

### B11. API Response Envelope Type Accuracy
- TypeScript type for each API response must match the actual envelope key from the API docs.
- Don't assume `{ data: [] }` — verify the actual key name for every endpoint.
- Cross-reference against any API test transcripts in the PR (`api-test-*.md`).

### B12. Webhook Controller Must Not Swallow All Exceptions
- Blanket try-catch returning `200 OK` means failed webhooks are silently dropped — provider won't retry.
- Unexpected exceptions should propagate or return 4xx/5xx.

### B13. No-Op Stubs Must Have No Side Effects
- A deferred/stub method must not still call `updateLastSync`, fire notifications, or write DB records.
- A true no-op: only a comment or `return`.

### B14. Duplicate Error Handling in Strategy and Caller
- If a method catches, logs, Sentries, and rethrows — the caller must NOT catch and log the same error again.
- Double-catch = duplicate audit log entries + duplicate Sentry alerts.

### B15. Enum Constants in Comparisons
- When a TypeScript enum exists for event types or status strings, use it — don't compare against string literals.

### B16. Dead Type Checks in Catch Blocks
- `instanceof AxiosError` in a DB/repository catch block will never be true — it's dead code.
- Match the error type to what the wrapped operation actually throws.

### B17. Database Transactions for Multi-Step Writes
- Multiple sequential saves (2+) across entities must be wrapped in a TypeORM transaction.
- Without a transaction, partial failure leaves orphaned records.

### B18. Race Condition / TOCTOU on State Guards
- Check-then-act is not atomic: two concurrent requests can both pass the check before either updates state.
- Fix: atomic conditional update — `UPDATE table SET flag = false WHERE id = $1 AND flag = true`.
- Or: wrap in a transaction with `SELECT FOR UPDATE`.

### B19. Missing Null Check on `findOne()`
- `findOne()` returns `null` when no record matches — accessing without guard causes silent data corruption.
- Pattern: `if (!record) throw new NotFoundException('record not found');`

### B20. Credentials in Documentation Files
- Real API tokens in `.md` files or API test transcripts are committed to git history permanently.
- Use clearly fake placeholders: `YOUR_BEARER_TOKEN_HERE`, `<api-token>`.
- Applies to staging credentials too.

### B21. Input Normalization Consistency
- New flows must normalize user-provided strings (email, username) the same way as existing flows.
- Check how the login/existing flow handles the same field — `trim().toLowerCase()`, `@Transform`, SQL `LOWER(TRIM(...))`.

---

## Part 2 — Human Reviewer Checklist (Design & Readability)

### G1. Method Complexity
- Methods longer than ~40 lines with multiple concerns — extract to focused helpers.
- Deeply nested `if/else` blocks that could be a private method.

### G2. Named Constants
- Magic strings for status/state values — check if constants already exist.

### G3. Naming Specificity
- Vague or mismatched names — method named for X that contains logic for Y.
- Names that require reading the body to understand.

### G4. Documentation
- New method similar to an existing one — explain the difference in a comment.
- New state transitions — update state machine or architecture docs.
- Complex helpers without JSDoc or inline explanation.

### G5. Test Data Realism
- Price, quantity, dimensions using `faker.string.alphanumeric()` instead of numeric generators.
- Currency fields using random strings instead of `faker.finance.currencyCode()`.

### G6. Test Naming Clarity
- Vague words: "completely", "properly", "correctly", "edge" without specifics.
- Grammar errors in test descriptions.
- Preferred: `should <do something> when <condition>`.

### G7. No Real URLs or Credentials in Tests or Service Defaults
- All test URLs must be clearly dummy (`https://example.com`, `https://test.invalid`).
- API keys and tokens must be obviously fake placeholders.
- No production-looking base URL hardcoded as a service default — use `ConfigService` only, no live URL fallback.

### G8. Test Assertion Completeness
- Crypto/signature operations: validate the output value, not just that the function ran.
- Skip paths: assert downstream was not called.
- Retry/token-refresh flows: add a test for when the retry itself also fails, not just the first call.

### G9. `.env.example` Completeness
- All new env vars added to `.env.example` with a descriptive placeholder.

### G10. Type Precision
- `||` chains that should be `as const` arrays or union literal types.
- Optional fields that should be required.
- When a field only needs on/off, use `boolean` with a descriptive `is_` name — not a nullable date or status enum.

### G11. Logical Grouping
- New types/constants placed in the section matching their domain (auth, payment, etc.).

### G12. Idempotency of External Calls in Retry Contexts
- In cron/retry-driven pushes: if the call succeeds externally but fails to record locally, the next retry creates a duplicate.
- Check whether the external API supports idempotency keys, or check if the resource already exists before creating.

### G13. Log Level for Security Failures
- Failed HMAC validation, invalid auth, unauthorized access → `error`, not `warn`.
- Warnings imply "unusual but possibly ok" — security failures are always errors.

### G14. Use Existing Helpers Consistently
- Before constructing a cache key, identifier, or formatted string inline, check if a helper already exists.
- Inconsistent construction (helper in one place, inline in another) means future changes only apply in some places.

### G15. YAGNI — Avoid Implementing Unbuilt Features
- Constants, entity fields, or logic for features not yet built should be deferred.
- "We'll need this later" is not enough — add it when the feature is actually being implemented.

### G16. Database Schema & Migration Quality
- Entity column decorators must match the actual DB type (`timestamptz`, `bigint`, `smallint` — not generic `int`/`float` where more specific types fit).
- Numeric columns for whole numbers: use `int`/`bigint`/`smallint`, not `float`/`decimal`.
- Migration `varchar` columns: specify explicit length where the domain has a known maximum (hash, code, slug).
- Column defaults must match nullable design (nullable → default `null`).
- Index columns must match actual query patterns — add UNIQUE index on lookup columns (hash, token, code); don't index columns that are never filtered on.

---

## Step 3: Report Findings

Group by part. For each issue:

```
[B3] apps/order/src/services/example.service.ts:10
Severity: Medium
Issue: `EXTERNAL_API_URLS` reads process.env at module-load time before ConfigModule bootstraps.
Fix: Move env var access into ConfigService calls inside methods.

[G1] apps/core/src/services/example.service.ts:268
Issue: processRecord method handles 3 distinct concerns inline — extract to private helpers.
Fix: Extract payload mapping, validation, and fallback logic into separate methods.
```

## Step 4: Final Verdict

```
Static analysis issues:  X high, Y medium, Z low
Human Reviewer issues: X blocking, Y nit

Overall: READY / NEEDS CHANGES
```

---

## Individual Skills

Run separately if you only need one perspective:
- `pr-review-static` — runtime bugs and static analysis only
- `pr-review-human` — human review style: naming, complexity, docs, test design
