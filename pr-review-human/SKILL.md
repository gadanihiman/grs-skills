---
name: pr-review-human
description: Human reviewer self-review for backend PRs — naming, complexity, DB schema, test design, type precision. Use when user says "review my PR", "check my PR", "human review", or wants design/readability feedback. Applies to any TypeScript backend; pair with pr-review-frontend for full-stack PRs.
---

# PR Review — Human Reviewer Patterns

## Overview

This skill runs a self-review checklist based on patterns observed in actual PR reviews on NestJS/TypeScript backend repos. It helps catch issues a thorough human reviewer consistently flags before submitting for review.

## Required Workflow

**Follow these steps in order.**

### Step 1: Understand the diff

Run `git diff main...HEAD` or read the list of modified files to understand the scope of changes.

### Step 2: Apply the Checklist

Work through each category below. Flag every issue found with the file path and line number.

---

## Checklist

### 1. Method Complexity & Single Responsibility

Flag methods that grow too large or handle too many concerns.

> "This is massively increasing complexity of this already complex method. Would be a good idea to extract this logic to its own method or a few."
> "Would be a good idea to extract this to its own method or a few."
> "Could extract all this to its own method or a few."

**Check:**
- Are there methods longer than ~40 lines containing multiple distinct concerns?
- Is there logic that should be a private helper method?
- Are there deeply nested `if/else` blocks that could be extracted?

### 2. Named Constants vs Magic Strings/Values

Always ask whether magic strings have constants defined elsewhere.

> "Do we have constants for these states?"
> "Same as above — do we have constants for these states?"

**Check:**
- Are string literals used inline that should be named constants?
- Are status/state values hardcoded instead of referencing existing constants?
- Search for existing constant files before adding new inline strings.

### 3. Naming Clarity & Specificity

Flag vague or misleading names — methods, variables, files, and test descriptions.

> "Could change to more specific name and could add some documentation."
> "Could be a more specific name."
> "This is a ServiceA helper — how come we have something with ServiceB?" (naming mismatch)

**Check:**
- Are method/variable names specific enough to describe what they do without reading the body?
- Are there naming mismatches — e.g., a helper named for X that contains logic for Y?
- Would a new reader understand the name without context?

### 4. Documentation

Request documentation whenever logic is non-obvious, especially for helpers and similar-looking methods.

> "Could use some documentation to explain what's the difference from `generateSignature`."
> "This could use some documentation."
> "Please update state machine documentation."

**Check:**
- Are there new methods similar to existing ones without explaining the difference?
- Are new state transitions documented in relevant state machine or architecture docs?
- Do helpers have JSDoc/inline comments explaining purpose and usage?
- Did this change make any existing docs stale?

### 5. Test Data Realism

Scrutinise mock data types — mocks should use semantically correct values, not generic faker strings.

> "Price can be alphanumeric?" → fix: `faker.number.float(...).toString()`
> "What format is currency that is 10 chars in length?" → fix: `faker.finance.currencyCode()`
> "How come dimensions are alphanumeric?" → fix: `faker.number.float(...).toString()`

**Check:**
- Are numeric fields (price, quantity, dimensions, weight) using number generators, not `faker.string.alphanumeric()`?
- Are currency fields using valid ISO codes (3 chars), not random strings?
- Are URL fields using dummy but realistic shapes (e.g., `https://example.com/...`)?
- Are date fields using date generators?

### 6. Test Naming Clarity

Read every test name and flag grammar issues and vague phrasing.

> "What does 'completely' mean here?"
> "Sorry, what's the 'product edge'?"
> "Did you mean 'successfully'?"
> "Sorry, what does 'fetching calling' mean?"

**Check:**
- Is every `it()`/`test()` description grammatically correct?
- Do test names precisely describe the scenario and expected outcome?
- Avoid vague words: "completely", "properly", "correctly", "edge" without specifics.
- Preferred pattern: `should <do something> when <condition>`

### 7. No Real URLs or Credentials in Tests or Service Defaults

Flag real-looking URLs and credentials in unit tests — and also in service-level defaults that could accidentally point to production.

> "is this a dummy URL? If not — let's make it such"
> "Let's change this to a dummy URL, if it's not."
> "is this production URL set by default? If so — please change to some dummy one to prevent incidents 🙏"

**Check:**
- Are all URLs in test files clearly dummy (e.g., `https://example.com`, `https://test.invalid`)?
- Are API keys, tokens, secrets using obviously fake placeholder values?
- No real partner IDs, shop IDs, or credentials from real systems.
- Are there production-looking base URLs hardcoded as defaults in service constructors or constants? These should use `ConfigService` only — no hardcoded fallback to a live URL.

### 8. Test Assertion Completeness

Check that tests actually validate critical behaviour, including negative assertions on guard/skip paths, and that multi-step flows are covered for all failure branches.

> "Is there a way to actually validate that the signature has a correct value?"
> Guard/skip tests should assert `expect(service.processRecord).not.toHaveBeenCalled()`
> "What about the scenario when the request fails even after refreshing the token?"

**Check:**
- For guard/skip paths: does the test assert that downstream methods were NOT called?
- For cryptographic operations: is the output value validated, not just that the function ran?
- Are all critical side effects (e.g., `markAsFinalised`) asserted in happy-path tests?
- For retry/token-refresh flows: is there a test for the case where the retry itself also fails (not just the first failure)?

### 9. `.env.example` Completeness

Check that new env vars appear in `.env.example`.

> "Should it also have `SERVICE_SANDBOX_MODE`?"

**Check:**
- If new env vars were added, are they in `.env.example` with a descriptive placeholder?

### 10. Type Precision

Favour precise types over loose patterns.

> Suggested moving from `||` chain constants to `as const` arrays or union literal types.
> Optional fields that are always provided should be required.
> "Could be just a boolean if we'd change it to something like `isAvailable`. Expiration could just set it to `false` in the future if needed."

**Check:**
- Are constants defined with `||` chains that should be `as const` tuples or union types?
- Are optional fields (`field?: T`) used where the field is always present and should be required?
- When a field only needs to represent on/off, prefer `boolean` with a descriptive `is_` name over a nullable date or status enum — it's simpler and future logic can just set it to `false`.

### 11. Logical Grouping of Types & Constants

Notice when types or constants are placed in the wrong logical section.

> "Nit: Shouldn't these be under the same domain section as well? =).."

**Check:**
- Are new types/constants placed in the section that matches their domain?
- Are auth types under auth? Payment types under payment? etc.

### 12. Idempotency of External Calls in Retry Contexts

Flag places where a call to an external system is made in a cron or retry context without considering what happens if the call succeeds externally but fails to record locally — causing the next retry to create a duplicate.

> "Just pointing out that if this call fails — we'll try to create the record again in the next cron run, but it would have already been created in the external system."

**Check:**
- Are there cron-driven or retry-driven calls to external APIs where a partial failure (succeeded remotely, failed to record locally) would lead to duplicate creation on retry?
- Does the external API support idempotency keys or duplicate detection?
- If not, consider checking whether the resource already exists before creating it.

### 13. Log Level for Security and Validation Failures

Flag when a security-relevant failure (e.g., failed HMAC signature validation, missing auth token) is logged at `warn` instead of `error`.

> "I think this deserves to be an error." (HMAC guard logging warning on invalid signature)

**Check:**
- Are security failures (invalid signatures, unauthorized access, failed auth) logged at `error` level, not `warn`?
- Warnings imply "something unusual but possibly ok" — security failures are always errors.

### 14. Use Existing Helpers Consistently

Flag when code manually constructs a value (key, path, string) that already has a dedicated helper function elsewhere.

> "Let's also use `getAccessTokenCacheKey` to be safe?"

**Check:**
- Before constructing cache keys, identifiers, or formatted strings inline, search for an existing helper that does the same.
- If a helper exists for building a value, use it everywhere — don't mix inline construction with helper usage in the same codebase.
- Inconsistent construction means a future change to the format only gets applied in some places.

### 15. YAGNI — Avoid Implementing Unbuilt Features

Flag when constants, fields, or logic are added for a feature that does not exist yet.

> "We don't have expiration logic yet, hence not sure this is needed =)..."

**Check:**
- Are there constants, entity fields, or validation rules for a feature (e.g., expiration, quotas, tiers) that has not been built yet?
- Defer those additions until the feature is actually being implemented.
- The comment "we'll need this later" is not enough justification — add it when "later" arrives.

### 16. Database Schema & Migration Quality

Review entity column types and migrations for precision — flag loose types, missing constraints, wrong defaults, and mismatched indexes.

> "This is DateTime, right?" (entity field missing timestamptz decorator)
> "Let's make it a big integer. No need for decimal points in this case."
> "Could be a small int, not sure if ORM allows to specify."
> "is it possible to specify the length?" (migration column missing length)
> "Default should be `null`, right? =)..." (column default mismatch)
> "We are going to be querying by `hash`, right? `status` column index does not make sense."
> "You might want to add UNIQUE index on the `hash` column."

**Check:**
- Entity field decorators: does `@Column()` specify the right type (`timestamptz`, `bigint`, `smallint`) to match the actual data?
- Numeric columns: use `int`/`bigint`/`smallint` for whole numbers, not `float`/`decimal`.
- Migration columns: specify explicit lengths for `varchar` columns where the domain has a known maximum (hash strings, codes, slugs). Ask "is it possible to specify the length?" for unbound varchars.
- Column defaults: nullable columns should default to `null`; non-nullable columns should have an explicit default.
- Index design: indexes must match the actual query patterns.
  - Add a UNIQUE index on lookup columns (e.g., `hash`, `code`, `token`).
  - Don't add indexes on columns that are never used as a query filter.

---

## Step 3: Report Findings

For each issue found, output:

```
[CATEGORY] file/path:line
Issue: <description>
Fix: <suggestion>
```

If no issues in a category, skip it.

## Step 4: Summary

End with:
- Total issues found (blocking / nit)
- Files most affected
- Verdict: ready for review / needs changes before submitting
