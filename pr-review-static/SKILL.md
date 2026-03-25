---
name: pr-review-static
description: Static analysis self-review for a PR — runtime bugs, logic errors, silent failures, test correctness. Use when user says "static review", "check for bugs", "logic review", or wants to catch runtime/logic bugs before submitting a PR.
---

# PR Review — Static Analysis Patterns

## Overview

This skill runs a static analysis self-review checklist based on patterns from automated and manual code reviews on NestJS/TypeScript backend repos. It focuses on runtime bugs, silent logic errors, unused code, and test correctness — things that compile fine but break at runtime or make tests unreliable.

## Required Workflow

**Follow these steps in order.**

### Step 1: Understand the diff

Run `git diff main...HEAD` or read the list of modified files to understand the scope.

### Step 2: Apply the Checklist

Work through each category. Flag every issue with file path and line number.

---

## Checklist

### 1. Module Initialisation Timing

Static analysis flags constants that read `process.env` at import time, before NestJS bootstraps `ConfigModule`.

> "EXTERNAL_API_URLS reads process.env at module-load time (before NestJS bootstraps ConfigModule)... the URLs will resolve to empty strings because the .env hasn't been parsed yet."

**Check:**
- Are any module-level constants (outside a class/function) reading `process.env` directly?
- If `ConfigModule` / `ConfigService` is used in the app, env vars must be accessed via `ConfigService` at runtime, not via `process.env` at import time.
- Pattern to flag: `const FOO = process.env.BAR` at top of file (not inside a class method or factory).

### 2. Silent Logic Bugs in Expressions

Static analysis catches expressions that evaluate correctly syntactically but produce wrong values at runtime.

> "`CONNECTION_TYPES` uses `||` (logical OR) between non-empty string constants, so it always evaluates to just the first operand... This changes both the runtime value and the TypeScript literal type."
> "`currentQuantity?: number`... `undefined <= 0` evaluates to `false` (NaN comparison). An item without currentQuantity would bypass the guard entirely."

**Check:**
- Are there `||` chains between non-empty string constants used to produce a "combined" value? They always resolve to just the first truthy operand — use `as const` array or union type instead.
- Are optional fields (`field?: T`) used in comparisons like `field <= 0` or `field === x` without a null check? `undefined` comparisons silently return `false`.
- Are reordered `||` chains changing which value is first (and therefore the runtime result)?

### 3. Unused Code

Static analysis flags unused imports, variables assigned but never read, and dead assignments.

> "Unused import throwError."
> "The initial value of pushStage is unused, since it is always overwritten."
> "Unused import StatusMode."

**Check:**
- Are there imported symbols that are never referenced in the file?
- Are there variables initialised with a value that is always immediately overwritten before first read? Declare without initial value instead: `let x: Type;`
- Are there imported types used only in comments or removed code?

### 4. Test Assertion No-Ops (Missing Parentheses)

Static analysis catches Jest matchers called as property accesses instead of function calls — they silently pass every time.

> "`expect(mockLogger.setContext).toHaveBeenCalled;` is missing parentheses and silently does nothing... These assertions will always pass regardless of whether setContext was actually called."

**Check:**
- Scan all test files for `.toHaveBeenCalled` without `()`.
- Same for `.toBeDefined`, `.toBeTruthy`, `.toBeFalsy`, `.toBeNull` — all require `()`.
- Pattern to search: `toHaveBeenCalled[^(]` in spec files.

### 5. Flaky Tests from Random Data

Static analysis identifies tests that use `faker` in ways that can randomly produce the exact value being tested against, causing intermittent failures.

> "The 'invalid routing' test sets the country to `faker.location.countryCode()` while createMockRecord() always defaults to `country_code: 'US'`. If faker randomly returns 'US', the guard returns false... ~0.4% of runs."

**Check:**
- Are there tests where `faker` generates a value that could randomly collide with a hardcoded value in the mock or the system under test?
- Use explicit hardcoded values for boundary conditions: `'NOT_DEFAULT'` instead of `faker.location.countryCode()` when testing mismatch.
- Are faker seeds set where randomness matters for reproducibility?

### 6. Redundant Type Definitions

Static analysis flags types that duplicate an existing type/interface rather than reusing it.

> "`OrderStatusResource` interface is structurally identical to the existing `OrderStatus` type... Having a second, inlined copy creates a maintenance burden — if the original types change, the copy won't automatically stay in sync."

**Check:**
- Are there new interfaces/types that are structurally identical (or subsets of) existing types?
- Before defining a new type, search the codebase for existing types that cover the same shape.
- Prefer extending or reusing existing types over duplicating them.

### 7. Wrong Test Title

Static analysis catches test descriptions that don't match what the test actually tests.

> "The test titled 'should throw error on failed calling service.updateLastSync' actually sets up `mockService.updateDetails.mockRejectedValue(error)`, meaning it tests `updateDetails` failure."

**Check:**
- Does every test description match the mock setup and assertion inside it?
- If a test name says "when X fails", is X the thing actually being mocked to fail?
- Read the test name and then read the `mockRejectedValue` / `mockResolvedValue` calls — they must match.

### 8. Missing Critical Assertions

Static analysis flags when a test passes but fails to assert a critical side effect that is the whole point of the code path.

> "The success test... never asserts that `mockService.markAsFinalised` was called with the record. A regression that removes the call would go undetected."

**Check:**
- In happy-path tests, are all critical side effects asserted? (state changes, service calls, DB writes, status updates)
- In skip/guard tests, are downstream methods asserted to NOT have been called?
- Compare against similar, passing test files in the codebase to check what assertions are expected.

### 9. URL Path Construction Bugs

Static analysis catches cases where a URL path is built incorrectly — e.g., the signature uses the correct path but the actual HTTP call uses a different one.

> "The `path` variable used for signature computation correctly includes `/api`... but the actual HTTP URL construction omits it."

**Check:**
- Is the same path string used consistently for both signature generation and the actual HTTP request?
- Are base URLs missing a path prefix that the API requires (e.g., `/api`)?
- Cross-reference URL construction against the external API's documented endpoint format.

### 10. Status Mapper Completeness

Static analysis catches when a status mapping function never maps any value to a critical terminal state, or maps failure statuses to `null` without logging — meaning records can never complete or failures are silently dropped.

> "`mapStatusToInternal` maps `LABEL_GENERATED` to `'in_progress'` instead of `'completed'`. Since no value ever maps to `'completed'`, records can never be finalized through status events."
> "`mapFailureStatus` returns `null` for `FAILED` and `CANCELLED` with no error logging, no Sentry notification, nothing."

**Check:**
- Does at least one status value in the external API map to each terminal internal state (e.g., `'completed'`, `'failed'`)?
- When a mapper returns `null` or an unknown status, is that logged + Sentry notified?
- Be aware that tests using `.mockReturnValue('completed')` can mask a wrong real mapping — check the actual mapper logic.

### 11. API Response Envelope Type Accuracy

Static analysis catches when the TypeScript response type declares `{ data: [] }` but the actual API returns a differently-named envelope key.

> "The `listItems` return type is `{ data: ItemData[] }` but the actual API returns items under an `items` key — accessing `response.data?.data?.[0]` silently returns `undefined`."
> "Response types use the wrong envelope key — API returns `{ results: [...] }` not `{ data: [...] }`."

**Check:**
- Does the TypeScript type for each API response match the actual envelope key from the API docs?
- Cross-reference against any API test transcripts or docs in the PR (e.g., `api-test-*.md`).
- Don't assume `{ data: [] }` — verify the key name for every endpoint (`{ items: [] }`, `{ result: {} }`, `{ records: [] }`, etc.).

### 12. Webhook Controller Must Not Swallow All Exceptions

Static analysis flags webhook controllers with a blanket try-catch that always returns `200 OK` — this tells the webhook provider that delivery succeeded, so it won't retry, and failures are permanently lost.

> "The try-catch in `handleWebhookEvent` catches all exceptions and always returns `{ message: 'OK.' }` with HTTP 200. If a webhook arrives during a transient DB issue, the status update is permanently lost."

**Check:**
- Does the webhook controller have a blanket `try-catch` that returns `200` for all exceptions?
- Unexpected errors should propagate or return a 4xx/5xx so the provider retries.
- Acceptable to catch and return 200 only for known, expected edge cases (e.g., duplicate events), not all errors.

### 13. No-Op Stubs Must Have No Side Effects

Static analysis catches deferred/stub methods that still perform real side effects (DB writes, notifications, timestamp updates) despite being explicitly marked as not implemented.

> "A cron job calls `syncData`, which is explicitly a no-op stub. Despite doing no real work, it still calls `updateLastSync` and creates notifications per-user, giving operators false confidence."

**Check:**
- Are there stub or deferred methods that still call `updateLastSync`, send notifications, or write to the DB?
- A true no-op should contain only a comment or `return` — no side effects.

### 14. Duplicate Error Handling in Strategy and Caller

Static analysis flags when a method catches an error, logs it, notifies Sentry, and rethrows — and then its caller catches the same rethrown error and logs + Sentries again.

> "`Service.pushRecord` catches `AxiosError`, logs and notifies Sentry, then re-throws. The caller `triggerRecordSync` catches the same error and logs + Sentries again. Every failure produces duplicate audit log entries and duplicate Sentry alerts."

**Check:**
- If a method catches, logs, and rethrows — does its caller also catch and log the same error?
- Pattern: only one level of the call stack should log and Sentry for a given error.

### 15. Enum Constants in Comparisons

Static analysis flags raw string literals used in comparisons when a TypeScript enum already defines those values.

> "`handleEvent` compares `body.event` against `'record.status_update'` instead of using `EventType.RECORD_STATUS_UPDATE`. The DTO itself uses `@IsEnum(EventType)`."

**Check:**
- Are there string literal comparisons (`=== 'record.status_update'`) when an enum constant already exists?
- Inconsistent use of enum vs string makes the code fragile and refactoring-prone.

### 16. Dead Type Checks in Catch Blocks

Static analysis flags `instanceof` checks in catch blocks that can never be true based on what the operation actually throws.

> "The catch block for `updateRecord` checks `e instanceof AxiosError`, but `updateRecord` is a database/repository operation — it will never throw an `AxiosError`."

**Check:**
- Are there `instanceof AxiosError` (or other HTTP error types) in catch blocks around DB/repository operations?
- Match the expected error type to what the wrapped operation actually throws.

### 17. Database Transactions for Multi-Step Writes

Static analysis flags when multiple sequential repository saves have no wrapping transaction — a failure midway leaves orphaned records.

> "The `register` method performs four sequential writes with no transaction. If any intermediate step fails, already-committed records remain as orphaned data."

**Check:**
- Are there methods that perform 2+ sequential saves/updates across entities?
- Wrap multi-step writes in a TypeORM transaction: `dataSource.transaction(async (manager) => { ... })`.
- The flag/status update should be the last step in the transaction, not the first.

### 18. Race Condition / TOCTOU on State Guards

Static analysis catches check-then-act patterns that are not atomic — two concurrent requests can both pass the check before either marks the state.

> "Two requests can both pass `validateCode` (both see `is_available = true`), then both call `markAsUsed` (which unconditionally sets it to `false`). `markAsUsed` needs an atomic conditional update: `UPDATE table SET flag = false WHERE id = $1 AND flag = true`."

**Check:**
- Is there a validate-then-update pattern (check if available → mark as used) without an atomic conditional update?
- Fix: use an atomic `UPDATE ... WHERE flag = true` that only succeeds if the condition still holds, or wrap in `SELECT FOR UPDATE`.
- Applies to: invitation codes, one-time tokens, idempotency keys, any "use once" resource.

### 19. Missing Null Check on Repository `findOne()`

Static analysis flags when the result of `findOne()` is used directly without a null guard — `findOne()` returns `null` if no record matches.

> "`roleRepository.findOne()` can return `null` if the role doesn't exist. The result is passed directly without a null check, which would silently create a user without a role."

**Check:**
- Is every `findOne()` result checked before use?
- Pattern: `const role = await roleRepo.findOne(...); if (!role) throw new NotFoundException('role not found');`
- Especially critical when the missing record would leave downstream entities in a broken state.

### 20. Credentials and Tokens in Documentation Files

Static analysis flags real API tokens committed inside `.md` documentation files — they end up in git history permanently.

> "The API test transcript file contains a plaintext staging Bearer token that will be committed to the repository's Git history permanently."

**Check:**
- Do any `.md` files, API test transcripts, or curl example docs contain real tokens, keys, or passwords?
- Replace with clearly fake placeholders: `YOUR_BEARER_TOKEN_HERE`, `<api-token>`.
- Applies to staging credentials too — they're still real access tokens.

### 21. Input Normalization Consistency

Static analysis flags when a new flow handles user input (email, username, slug) differently from the existing flow — enabling duplicate records with different casings.

> "The registration flow stores emails without normalization, while the existing login flow normalizes with `trim().toLowerCase()`. Two users could register with different casings of the same email, bypassing the duplicate-email check."

**Check:**
- Does the new flow normalize user-provided strings (email, username) the same way as existing flows?
- Search for how the login/existing flow handles the same field (e.g., `@Transform` in DTO, `LOWER(TRIM(...))` in SQL).
- Inconsistent normalization creates hard-to-debug duplicate account issues.

---

## Step 3: Report Findings

For each issue found, output:

```
[CATEGORY] file/path:line
Severity: High / Medium / Low
Issue: <description>
Fix: <concrete suggestion>
```

## Step 4: Summary

End with:
- Total issues by severity (High / Medium / Low)
- Files most affected
- Verdict: ready for review / needs fixes before submitting
