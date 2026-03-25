---
name: pr-review-frontend
description: Frontend PR self-review for React, Next.js, Vue.js, Tailwind CSS, and React Query (F1–F16). Use when user says "frontend review", "review my React/Vue PR", "check my UI code", working in a frontend repo, or when the diff contains .tsx/.vue/.css files. Pair with pr-review-human for a complete review.
---

# PR Review — Frontend Patterns

## Overview

This skill runs a frontend-specific self-review checklist covering React, Next.js, Vue.js, Tailwind CSS, and React Query. Use alongside `pr-review-static` and `pr-review-human` for a complete review.

## Required Workflow

**Follow these steps in order.**

### Step 1: Understand the diff

Run `git diff main...HEAD` to see all changed files and understand the scope.

### Step 2: Apply the Checklist

Work through each category. Flag every issue with file path and line number.

---

## Checklist

### F1. React Hooks Rules Violations

React hooks must be called at the top level — never inside conditions, loops, or nested functions.

> "Hook called inside a condition — if the condition is false on the first render, hook order changes on subsequent renders and causes state corruption."

**Check:**
- Are any hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, `useQuery`, etc.) called inside `if`, `for`, or nested functions?
- Are custom hooks always called at the top level of the component?
- Are hooks called from React function components or custom hooks only (not regular functions)?

### F2. Missing or Incorrect useEffect Dependencies

`useEffect` with a missing or incorrect dependency array causes stale closures or infinite loops.

> "The effect reads `userId` but it's missing from the dependency array — the effect will always run with the initial value even after userId changes."
> "Adding the callback directly in deps without `useCallback` causes the effect to re-run on every render."

**Check:**
- Does every `useEffect` have a dependency array?
- Are all variables/functions used inside the effect listed in the deps array?
- Are functions in deps wrapped in `useCallback` to prevent infinite loops?
- Are objects/arrays in deps stable (memoized) or will they cause infinite re-renders?

### F3. Unnecessary Re-renders

Components re-rendering on every parent render when they don't need to.

**Check:**
- Are expensive components wrapped in `React.memo` where appropriate?
- Are callback props passed to memoized child components wrapped in `useCallback`?
- Are derived values that are expensive to compute wrapped in `useMemo`?
- Are new object/array literals created inline as props? (e.g., `style={{ margin: 0 }}` on every render)
- Are anonymous functions passed as props causing unnecessary re-renders?

### F4. Missing key Prop or Unstable Keys

React uses `key` to track list items — missing or unstable keys cause incorrect reconciliation.

> "Using array index as key means inserting an item at the top shifts all keys, causing React to re-render every item instead of just inserting one."

**Check:**
- Does every `.map()` rendering JSX have a `key` prop?
- Are keys unique and stable — not array indexes, not random values (e.g., `Math.random()`)?
- Are keys derived from a stable ID from the data (e.g., `item.id`)?

### F5. Next.js SSR/SSG Gotchas

Code that runs fine on the client can crash during server-side rendering.

> "`window.localStorage` accessed at module level — throws `ReferenceError: window is not defined` during SSR."
> "`useRouter()` called outside a component — works in browser but fails during static generation."

**Check:**
- Is `window`, `document`, `navigator`, or `localStorage` accessed outside of `useEffect` or a client-only check?
- Are browser-only APIs guarded with `typeof window !== 'undefined'`?
- Are third-party libraries that access `window` imported dynamically with `{ ssr: false }`?
- Is `useSearchParams()` used without wrapping in a `Suspense` boundary (Next.js 13+)?

### F6. Next.js Image and Font Optimization

Using `<img>` instead of `<Image>` bypasses Next.js optimization.

**Check:**
- Are all images using Next.js `<Image>` component instead of `<img>`?
- Do `<Image>` components have `width`, `height`, or `fill` specified?
- Are external image domains added to `next.config.js` `images.domains`?
- Are fonts loaded via `next/font` instead of a `<link>` tag in `_document`?

### F7. React Query — Stale Data and Error Handling

Incorrect React Query configuration leads to stale UI or silent failures.

**Check:**
- Is `staleTime` configured appropriately? Default is `0` — every focus triggers a refetch.
- Are query errors handled — is there an `error` state shown to the user, not just `isLoading`?
- Are mutations using `onError` to surface failures to the user?
- After a mutation, is `queryClient.invalidateQueries` called to refresh affected queries?
- Are dependent queries using `enabled: !!dependency` to prevent firing before data is ready?
- Are query keys consistent and specific — does the key include all variables the query depends on?

### F8. Vue.js Reactivity Pitfalls

Vue's reactivity system has known edge cases where changes are not detected.

**Check:**
- Are new properties added to a reactive object using `set()` / `reactive()` re-assignment, not direct assignment (`obj.newProp = value` is not reactive in Vue 2)?
- In Vue 3 Composition API: are `ref` values accessed with `.value` inside `<script setup>`?
- Are `computed` properties used for derived state rather than recalculating in the template?
- Are `watch` dependencies stable — not causing infinite loops from mutating the watched value?
- Are `v-for` directives paired with `:key` bindings using stable IDs?

### F9. Tailwind CSS — Purge and Dynamic Classes

Tailwind purges unused classes at build time — dynamically constructed class names are stripped.

> "`'text-' + color` will be purged because Tailwind can't statically analyse the full class name."

**Check:**
- Are class names constructed dynamically? (e.g., `` `text-${color}` ``) — these will be purged in production.
- Use full class names in conditionals: `condition ? 'text-red-500' : 'text-green-500'` not `'text-' + color`.
- Are custom classes in `tailwind.config.js` `safelist` if they must be dynamic?
- Are responsive breakpoints (`sm:`, `md:`, `lg:`) applied mobile-first?

### F10. Accessibility (a11y)

**Check:**
- Do all `<img>` elements have an `alt` attribute (empty `alt=""` for decorative images)?
- Do interactive elements (`<div onClick>`, `<span onClick>`) use a proper `<button>` or `<a>` instead?
- Are form inputs associated with a `<label>` (via `htmlFor` / `for` or `aria-label`)?
- Are modal/dialog components trapping focus correctly and dismissible with Escape?
- Are icon-only buttons labeled with `aria-label`?
- Is color contrast sufficient for text against background?

### F11. TypeScript — Component Props Typing

**Check:**
- Are component props typed with an interface or type — not `any`?
- Are optional props marked with `?` and required props enforced?
- Are event handler types correct: `React.ChangeEvent<HTMLInputElement>` not `any`?
- Are `children` props typed as `React.ReactNode`?
- Are `ref` props typed with `React.Ref<ElementType>` when using `forwardRef`?

### F12. State Management — Minimal and Co-located State

**Check:**
- Is state lifted only as high as necessary? State shared by two siblings belongs in their parent, not a global store.
- Is server state (data from API) managed via React Query / SWR rather than manually in `useState`?
- Is derived state computed (via `useMemo` or `computed`) rather than stored in a separate `useState`?
- Are multiple related `useState` calls that always update together combined into one object?

### F13. Environment Variables

**Check:**
- Are client-side env vars prefixed with `NEXT_PUBLIC_` (Next.js) or `VITE_` (Vite)?
- Are secret/server-only env vars never prefixed with `NEXT_PUBLIC_` — this exposes them to the browser bundle?
- Are all new env vars added to `.env.example` with a placeholder value?

### F14. Bundle Size Awareness

**Check:**
- Are large libraries imported in full when only a part is needed? (e.g., `import _ from 'lodash'` vs `import debounce from 'lodash/debounce'`)
- Are heavy components (charts, editors, maps) lazy-loaded with `dynamic(() => import(...), { ssr: false })`?
- Are new dependencies checked for bundle size impact (bundlephobia.com)?

### F15. Error Boundaries

**Check:**
- Are async components or data-fetching components wrapped in an Error Boundary?
- In Next.js App Router, is there an `error.tsx` for route segments that can fail?
- Are loading states handled with `loading.tsx` / `Suspense` rather than conditionally rendering null?

### F16. Forms and Validation

**Check:**
- Are forms using a form library (React Hook Form, Formik, VeeValidate) rather than manual `useState` per field?
- Is validation both client-side (UX) and server-side (security)?
- Are form submissions debounced or disabled while in-flight to prevent double submissions?
- Are error messages shown next to the relevant field, not just a generic toast?

---

## Step 3: Report Findings

For each issue found, output:

```
[F3] components/ProductList.tsx:42
Severity: Medium
Issue: Anonymous callback passed as onClick prop to memoized child — defeats memo.
Fix: Wrap the callback in useCallback with appropriate dependencies.

[F9] components/Badge.tsx:8
Severity: High
Issue: Class name constructed as `'bg-' + color` — will be purged in production build.
Fix: Use full class names: condition ? 'bg-red-500' : 'bg-green-500'.
```

## Step 4: Summary

End with:
- Total issues by severity (High / Medium / Low)
- Files most affected
- Verdict: ready for review / needs fixes before submitting
