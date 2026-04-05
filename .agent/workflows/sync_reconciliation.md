---
description: Sync & Conflict Resolution
---

name: Sync & Conflict Resolution
description: Logic for reconciling local SQLite with Google Drive JSON mirrors
steps:
  - task: "Fetch remote metadata from Google Drive appData folder."
  - logic: "If remote_timestamp > local_timestamp: show side-by-side conflict UI."
  - task: "Upload 'SENT' PDF to Google Drive /Invoices folder."