# 🧪 Testing Rules & Best Practices

This document outlines the testing architecture, standards, conventions, and mandatory pre-deployment checks for the **75 Challenge** project.

---

## 1. Mandatory Pre-Deployment Checklist

Before any code is committed, pushed to GitHub, or deployed to Vercel, the following command sequence **MUST PASS with 0 errors**:

```bash
# 1. Run full test suite
npm test

# 2. Run TypeScript build & Next.js compilation check
npm run build

# 3. Run ESLint checks
npm run lint
```

> [!IMPORTANT]
> Never push breaking changes or failing tests to `main`. Every pull request and deployment relies on 100% passing tests.

---

## 2. Test Architecture & Directory Structure

All test files reside inside `src/test/`:

```text
src/test/
├── setup.ts                 # Global test environment, JSDOM & Canvas mocks
├── date-utils.test.ts       # Date formatting, 75-day calculations, year-end notice
├── streak-engine.test.ts    # Rule scheduling, 1 Streak Shield mechanics, reset evaluations
├── db.test.ts               # Pure db helpers: username slugs, preview-post rule
├── supabase-config.test.ts  # Project-URL normalization (the /rest/v1 footgun)
├── i18n.test.ts             # EN/DE parity: no missing keys, matching placeholders
├── feed.test.ts             # Positive-only feed filters (completed/shielded), cold-start mock schemas
└── components.test.tsx      # Unit tests for UI components (RuleCustomizer, HypeButton, HelpFeedback)
```

---

## 3. Testing Conventions & Guidelines

### Unit & Algorithmic Tests
1. **Calendar-Date Logging**:
   - Check-ins belong to their plain local calendar date. There is **no** cutoff-hour rollover to test — if you find a test asserting a 3 AM boundary, it is stale and should be removed.
2. **Fresh-Account Invariant**:
   - A newly created challenge must be on Day 1 with no logs. Assert this explicitly; it is the bug most likely to regress.
3. **Shield Accounting**:
   - `evaluateUserChallenge` must transition to `'failed'` when missed days outnumber remaining shields. This regressed once because the shield count was read but never consumed — keep the regression test.
   - Today is never judged; only days that are already over.
4. **State Machine Transitions**:
   - Verify that missing 1 past day prompts the Shield when `shields_remaining > 0`.
   - Verify that missing a 2nd past day (or when `shields_remaining === 0`) immediately transitions `status` to `'failed'`.
5. **Strict Positive-Only Filtering**:
   - Ensure test cases assert that daily logs with status `'failed'` or incomplete checkmarks are excluded from the community feed.
   - Note this is enforced twice: by the query filter *and* by RLS. Client-side tests cover the former; the policy is the real guarantee.

### What is NOT unit-tested
Anything requiring a live Supabase connection (`src/lib/db/*` network paths,
auth flows, Storage uploads) has no unit test — mocking the client end-to-end
would test the mock, not the code. Verify those by hand on
`dev.75challenge.quest` before promoting. Pure helpers extracted from those
modules (`toUsernameSlug`, `shouldShowPreviews`, `normalizeSupabaseUrl`) **are**
tested, so extract logic worth asserting rather than leaving it inline.

### Localization Tests (mandatory)
`src/test/i18n.test.ts` is a guard, not a formality. It must keep asserting that:
1. Every `en` key has a `de` translation, and vice versa — a missing key fails the suite.
2. `{placeholder}` tokens match exactly between the two languages.
3. Long strings are not identical across languages (a sign of a forgotten translation).

> When you add copy, add it to **both** locales in the same commit. The suite will not let a half-translated string reach `main`.

### Component & UI Tests
1. **Mocking External Browser APIs**:
   - Canvas, WebP compression, and `canvas-confetti` must be mocked in `src/test/setup.ts` to prevent DOM rendering crashes in JSDOM.
2. **User Interaction & Optimistic Feedback**:
   - Test that clicking reaction buttons in `HypeButton` updates the UI immediately without blocking on network responses.
3. **Validation Guards**:
   - Test that `RuleCustomizer` surfaces the minimum 2-rule requirement warning when fewer than 2 rules are selected.
4. **Provider-Free Rendering**:
   - Components use `useI18n()`, which falls back to English when rendered outside `I18nProvider`. Unit tests may therefore render components directly and assert against English copy.

---

## 4. Running Tests

| Command | Purpose |
|---|---|
| `npm test` | Runs all Vitest test suites once (CI / Pre-push mode) |
| `npm run test:watch` | Runs Vitest in interactive watch mode during development |
| `npm run build` | Compiles Next.js routes and verifies TypeScript types |
