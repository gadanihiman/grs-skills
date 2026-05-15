---
name: pr-check-style
description: Style and design review checklist for backend PRs — G1–G16 naming, complexity, documentation, test design, type precision, DB schema. Use when you want to check code quality and readability. For the full review workflow, use pr-review.
---

# PR Check — Design Review (G1–G16)

## Overview

Checks for naming clarity, method complexity, documentation gaps, test design issues, type precision, and DB schema quality — the things a thoughtful human reviewer consistently flags.

---

## Required Workflow

### Step 1: Understand the diff

Run `git diff main...HEAD` or read the list of modified files to understand the scope of changes.

### Step 2: Apply the Checklist

Work through each category below. Flag every issue found with the file path and line number.

---

## Checklist

### G1. Method Complexity
- Methods longer than ~40 lines with multiple concerns — extract to focused helpers.
- Deeply nested `if/else` blocks that could be a private method.

### G2. Named Constants
- Magic strings for status/state values — check if constants already exist before adding new inline strings.

### G3. Naming Specificity
- Vague or mismatched names — method named for X that contains logic for Y.
- Names that require reading the body to understand.

### G4. Documentation
- New method similar to an existing one — explain the difference in a comment.
- New state transitions — update state machine or architecture docs.
- Complex helpers without JSDoc or inline explanation.
- **API contract docs**: if SQL queries, computation logic, or response shapes in `.md` contract files are copy-pasted from an earlier draft, verify they still match the final implementation. A bug fix that changes query logic must update the contract doc too.

### G5. Test Data Realism
- Numeric fields (price, quantity, dimensions, weight) using `faker.string.alphanumeric()` instead of number generators.
- Currency fields using random strings instead of `faker.finance.currencyCode()`.
- URL fields using dummy but realistic shapes.

### G6. Test Naming Clarity
- Vague words: "completely", "properly", "correctly", "edge" without specifics.
- Grammar errors in test descriptions.
- Preferred: `should <do something> when <condition>`.

### G7. No Real URLs or Credentials in Tests or Service Defaults
- All test URLs must be clearly dummy (`https://example.com`, `https://test.invalid`).
- API keys and tokens must be obviously fake placeholders.
- No production-looking base URL hardcoded as a service default — use `ConfigService` only.

### G8. Test Assertion Completeness
- Crypto/signature operations: validate the output value, not just that the function ran.
- Skip paths: assert downstream was not called.
- Retry/token-refresh flows: add a test for when the retry itself also fails.

### G9. `.env.example` Completeness
- All new env vars added to `.env.example` with a descriptive placeholder.

### G10. Type Precision
- `||` chains that should be `as const` arrays or union literal types.
- Optional fields that should be required.
- When a field only needs on/off, prefer `boolean` with a descriptive `is_` name.

### G11. Logical Grouping
- New types/constants placed in the section matching their domain (auth, payment, logistics, etc.).

### G12. Idempotency of External Calls in Retry Contexts
- In cron/retry-driven pushes: if the call succeeds externally but fails to record locally, the next retry creates a duplicate.
- Check whether the external API supports idempotency keys, or check if the resource already exists before creating.

### G13. Log Level for Security Failures
- Failed HMAC validation, invalid auth, unauthorized access → `error`, not `warn`.
- Warnings imply "unusual but possibly ok" — security failures are always errors.

### G14. Use Existing Helpers Consistently
- Before constructing a cache key, identifier, or formatted string inline, check if a helper already exists.
- Inconsistent construction means a future change to the format only applies in some places.

### G15. YAGNI — Avoid Implementing Unbuilt Features
- Constants, entity fields, or logic for features not yet built should be deferred.
- "We'll need this later" is not enough — add it when the feature is actually being implemented.

### G16. Database Schema & Migration Quality
- Entity column decorators must match the actual DB type (`timestamptz`, `bigint`, `smallint`).
- Numeric columns for whole numbers: use `int`/`bigint`/`smallint`, not `float`/`decimal`.
- Migration `varchar` columns: specify explicit length where the domain has a known maximum (hash, code, slug).
- Column defaults: nullable columns should default to `null`; non-nullable columns should have an explicit default.
- Index design: UNIQUE index on lookup columns (hash, token, code); don't index columns never used as a query filter.
- **Index coverage**: for every new JOIN or `WHERE` clause in the PR, check if the column already has an index. Missing indexes on FK columns (`order_uuid`, `client_uuid`, `shipment_uuid`) cause full table scans.
- **Composite vs single-column index**: if a query filters on two columns together, evaluate a composite index — document the decision in the migration comment. A single-column FK index is always foundational; composite can be deferred when a cache (e.g., 1-hour Redis) keeps DB hit frequency low.
- **CONCURRENTLY**: large production tables may need `CREATE INDEX CONCURRENTLY`. Use `queryRunner.connection.query()` with `{ transaction: false }` since TypeORM's `createIndex()` does not support it natively.

### G17. Large Function Refactor
- New or modified public methods longer than ~40 lines that handle multiple distinct concerns should be split into focused private helpers.
- Signs a method is too large: more than one level of nesting, mixed IO + business logic + formatting in one body, or a comment that says "step 1 / step 2".
- Each helper should do one thing and be nameable with a clear verb phrase (e.g., `resolveTimezone`, `buildCacheKey`, `queryMonthlyMetrics`).

### G18. JSDoc on Public Methods
- Every new public function or method in services, helpers, guards, and `libs/` exports must have a JSDoc block.
- Minimum required: one-sentence imperative summary + `@param` for non-obvious params + `@returns` when the return type alone is not self-explanatory.
- Add `@throws` for every NestJS HTTP exception that can escape the method.
- Add `@see {@link Symbol}` to link to the primary collaborator when relevant.
- Private methods only need a comment if the logic is non-obvious; they do not require full JSDoc.

### G19. Test Constant Naming Convention
- Top-level fixture constants in `*.spec.ts` files must be prefixed with `TEST_` or `MOCK_` to distinguish them from production constants at a glance.
- Examples: `TEST_CLIENT_UUID`, `MOCK_ORDER_UUID`, `TEST_API_KEY`.
- Check: scan new spec files for bare `const CLIENT_UUID`, `const ORDER_UUID`, etc. without a prefix.

### G20. Repeated Inline Type Casts
- When the same type assertion appears 2+ times in a file (e.g., `req as Request & { user?: { sub: string } }`), extract it to a named type in `src/types/`.
- Inline casts scattered across multiple methods are easy to get out of sync when the JWT payload shape changes.
- Pattern to flag: the same `as X & { ... }` expression in more than one method in the same file.

### G21. `import type` for Type-Only Imports
- When an import is used only as a type annotation (never instantiated or called at runtime), use `import type { Foo } from '...'` instead of `import { Foo } from '...'`.
- Common cases: entity classes used only as `Repository<Entity>` type params, Express `Request`/`Response` used only in type positions, interfaces or types from external packages.
- `import type` is erased entirely at compile time — zero runtime cost and prevents accidental runtime dependency on the imported module.

---

## Step 3: Report Findings

For each issue found:

```
[G3] path/to/file.ts:42
Issue: method name is too vague — doesn't communicate what it does without reading the body.
Fix: rename to something that describes the actual behaviour.
```

If no issues in a category, skip it.

## Step 4: Summary

- Total issues found (blocking / nit)
- Files most affected
- Verdict: ready for review / needs changes before submitting
