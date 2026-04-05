---
description: Scaffolds the Electron project and DB schema
---

name: Initialize Invoicing App
description: Scaffolds the Electron project and DB schema
steps:
  - run: "npm create vite@latest . -- --template react-ts"
  - run: "npm install electron better-sqlite3 sharp date-fns googleapis"
  - run: "mkdir -p src/main src/renderer/components"
  - task: "Create SQLite schema for Invoices, Clients, and PaymentProfiles based on arch_rules.md"