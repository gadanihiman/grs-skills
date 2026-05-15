---
name: pr-check-static
description: Static analysis checklist for backend PRs (NestJS/TypeScript) — B1–B21 runtime bugs, logic errors, silent failures, test correctness. Use when you want to check for bugs only. For the full review workflow, use pr-review.
---

# PR Check — Static Analysis (B1–B21)

## Overview

Checks for runtime bugs, silent logic errors, unused code, and test correctness — things that compile fine but break at runtime or make tests unreliable.

---

## Required Workflow

### Step 1: Understand the diff

Run `git diff main...HEAD` or read the list of modified files to understand the scope.

### Step 2: Apply the Checklist

Work through each category. Flag every issue with file path and line number.

---

## Checklist

### B1. Module Initialisation Timing
- Are any `const FOO = process.env.BAR` declarations at module top-level (outside a class)?
- Env vars must be read via `ConfigService` at runtime, not `process.env` at import time.
- Pattern to flag: `const FOO = process.env.BAR` at top of file (not inside a class method or factory).

### B2. Silent Logic Bugs
- `||` chains between non-empty string constants always resolve to the first truthy operand — use `as const` array or union type instead.
- Optional fields (`field?: T`) used in comparisons like `field <= 0` silently return `false` when `undefined`.
- Check if reordering a `||` chain changed which value is evaluated first.

### B3. Unused Code
- Unused imports — especially after refactors.
- Variables assigned an initial value that is always overwritten before first read — declare without initial value.

### B4. Test Assertion No-Ops
- Scan all test files for `.toHaveBeenCalled` without `()`.
- Same for `.toBeDefined`, `.toBeTruthy`, `.toBeFalsy`, `.toBeNull` — all require `()`.

### B5. Flaky Tests from Random Data
- Tests where `faker` generates a value that could randomly collide with a hardcoded value in the mock or the system under test.
- Use explicit hardcoded values for boundary conditions.

### B6. Redundant Type Definitions
- New interfaces structurally identical to existing types — search before defining.

### B7. Wrong Test Title
- Test description says "X fails" but the mock actually simulates "Y fails".
- Read the test name and then read the `mockRejectedValue` / `mockResolvedValue` calls — they must match.

### B8. Missing Critical Assertions
- Happy-path tests: are all critical side effects asserted (state changes, service calls, DB writes)?
- Guard/skip tests: are downstream methods asserted `.not.toHaveBeenCalled()`?
- **Fire-and-forget paths**: if a method uses `.catch()` to silently swallow an error (e.g., a non-critical cache write), add a test that rejects the underlying call and asserts the method still returns successfully — confirming the error is truly swallowed and doesn't propagate.

### B9. URL Path Construction
- Same path string used for both signature generation and the actual HTTP call?
- Base URL missing a required path prefix (e.g., `/api`)?

### B10. Status Mapper Completeness
- Does at least one status value map to each terminal internal state (`'finalised'`, `'failed'`)?
- When a mapper returns `null` or an unknown status, is that logged + Sentry notified?

### B11. API Response Envelope Type Accuracy
- TypeScript type for each API response must match the actual envelope key from the API docs.
- Don't assume `{ data: [] }` — verify: `{ orders: [] }`, `{ order: {} }`, `{ shipments: [] }`, etc.

### B12. Webhook Controller Must Not Swallow All Exceptions
- Blanket try-catch returning `200 OK` means failed webhooks are permanently lost.
- Unexpected errors should propagate or return 4xx/5xx so the provider retries.

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
- Match the expected error type to what the wrapped operation actually throws.

### B17. Database Transactions for Multi-Step Writes
- Multiple sequential saves (2+) across entities must be wrapped in a TypeORM transaction.
- Without a transaction, partial failure leaves orphaned records.

### B18. Race Condition / TOCTOU on State Guards
- Check-then-act is not atomic — two concurrent requests can both pass the check before either updates state.
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

## Step 3: Report Findings

For each issue found:

```
[B1] path/to/file.ts:3
Severity: High
Issue: reads process.env at module-load time before ConfigModule bootstraps.
Fix: inject ConfigService, read inside method.
```

## Step 4: Summary

- Total issues by severity (High / Medium / Low)
- Files most affected
- Verdict: ready / needs fixes
