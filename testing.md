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
├── date-utils.test.ts       # 3:00 AM cutoff rollover, date validators, 75-day calculations
├── streak-engine.test.ts    # Rule scheduling, 1 Streak Shield mechanics, hard-reset evaluations
├── feed.test.ts             # Positive-only feed filters (completed/shielded), cold-start mock schemas
└── components.test.tsx      # Unit tests for UI components (RuleCustomizer, HypeButton, HelpFeedback)
```

---

## 3. Testing Conventions & Guidelines

### Unit & Algorithmic Tests
1. **Timezone & 3 AM Cutoff Invariance**:
   - Always test both standard hours (e.g. 12:00 PM) and early morning hours (< 3:00 AM) to ensure the 3:00 AM rollover operates consistently across date boundaries.
2. **State Machine Transitions**:
   - Verify that missing 1 past day prompts the Shield when `shields_remaining > 0`.
   - Verify that missing a 2nd past day (or when `shields_remaining === 0`) immediately transitions `status` to `'failed'`.
3. **Strict Positive-Only Filtering**:
   - Ensure test cases assert that daily logs with status `'failed'` or incomplete checkmarks are excluded from the community feed.

### Component & UI Tests
1. **Mocking External Browser APIs**:
   - Canvas, WebP compression, and `canvas-confetti` must be mocked in `src/test/setup.ts` to prevent DOM rendering crashes in JSDOM.
2. **User Interaction & Optimistic Feedback**:
   - Test that clicking reaction buttons in `HypeButton` updates the UI immediately without blocking on network responses.
3. **Validation Guards**:
   - Test that `RuleCustomizer` surfaces the minimum 2-rule requirement warning when fewer than 2 rules are selected.

---

## 4. Running Tests

| Command | Purpose |
|---|---|
| `npm test` | Runs all Vitest test suites once (CI / Pre-push mode) |
| `npm run test:watch` | Runs Vitest in interactive watch mode during development |
| `npm run build` | Compiles Next.js routes and verifies TypeScript types |
