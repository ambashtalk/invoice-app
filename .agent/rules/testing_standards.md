---
trigger: test, e2e, playwright, verify, QA
---

# Testing Standards & E2E Validation

To ensure application stability and prevent regressions in production, adhere to the following QA guidelines:

- **E2E Over Manual Verification**: Always leverage Playwright for validation of complex workflows rather than manual GUI tests.
- **Component Targeting**: When adding UI interactions in tests (`tests/e2e`), use structural queries (e.g., semantic testing, `aria-labels`), or `testId` attributes over fragile CSS class selectors.
- **Database Hygiene**: Ensure the local SQLite database resets its state `beforeEach` test. Leaking state between tests creates extremely difficult-to-diagnose phantom failures. Do not skip teardown steps.
- **Waiting for UI**: Avoid arbitrary `setTimeout`. Use Playwright's native `waitForSelector`, `locator.waitFor()` or wait for expected IPC network activity.
