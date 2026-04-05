---
description: How to run the complete automated E2E test suite via Playwright
---

Follow these steps to execute the full QA suite and verify the integrity of the application.

1. First, build the frontend codebase to ensure the latest changes are compiled for testing.
// turbo
```bash
npm run build
```

2. Execute the Playwright tests located under the e2e tests directory. This will start the Electron runtime in a test environment, clear local database stores dynamically per the test setup hooks, and execute the lifecycle specifications.
// turbo
```bash
npm run test:e2e
```

3. Review the terminal output for success and failure conditions. If a test fails, you must read the error logs directly and fix the regression before committing.
