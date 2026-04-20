## AI Collaboration Rules

- **Antigravity (Local)**: Lead Architect. Responsible for UI, feature logic, and manual code reviews.
- **Jules (Cloud)**: Background Support. Responsible for unit tests, dependency updates, and refactoring legacy modules.
- **Workflow**: Jules should always create a new branch (`jules/task-name`) and never commit directly to `main`.

## Project Overview

- Core Tech Stack: Electron (TypeScript), React, SQLite (`better-sqlite3`), Google API integration
- Purpose: Local-first invoice management with client sync via Google Drive

## Guiding Principles

- Architecture: Separate main/renderer processes; isolate sensitive logic in main
- State Management: Context API for shared state (NetworkContext, ToastContext)
- Naming: PascalCase for components, camelCase for props/variables
- Error Handling: Centralized error reporting in IPC handlers and database layer

## Directory Structure

```bash
src/
├── main/              # Electron backend (database, IPC, sync)
├── renderer/          # React frontend (UI components, pages)
└── shared/            # Common utilities (tax calculator, number formatting)
```

- Key modules: `database/repositories` (data access), `services` (business logic), `sync/drive-sync` (cloud integration)

## Workflow

- All non-trivial changes require a `PLAN.md` in the root directory
- Use `ANTIGRAVITY.md` for architectural decisions and tech stack direction
- New features must align with local-first design philosophy
- Crucial: Maintain separation between client-side UI and server-side logic
