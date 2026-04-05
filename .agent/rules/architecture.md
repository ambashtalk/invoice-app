---
trigger: always_on
---

# System Architecture Rules
- Framework: Electron + Vite + React.
- Database: Local-first persistence using `better-sqlite3`.
- State Management: Use React Context for UI state; IPC for database operations.
- Offline-First: All write operations must hit local SQLite first. Sync is a background fire-and-forget process.
- Google Integration: Use Google OAuth2 loopback for Gmail (sending/scheduling) and Drive (PDF storage/metadata sync).
- Security: Sensitive credentials (OAuth tokens) must be stored using Electron's `safeStorage` API.

# Development guideline
Constraint: Favor standard library or established lightweight packages (e.g., better-sqlite3, sharp, date-fns) over custom-built logic unless performance demands otherwise.