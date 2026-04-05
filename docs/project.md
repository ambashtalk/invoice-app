# Project Specification: AutomateInvoice (Local-First Electron App)

## 1. Executive Summary

An elite, offline-first Electron application designed for freelance invoice management. The system facilitates invoice generation (PDF), automated tax back-calculation, multi-currency support via real-time API, signature digitization, and asynchronous synchronization with Google Workspace (Drive/Gmail).

## 2. Technical Stack

* **Runtime:** Electron (Main + Renderer Processes)
* **Frontend:** React, Tailwind CSS (A4 Print-Optimized Layouts)
* **Database:** SQLite via `better-sqlite3` (Local Persistence)
* **Cloud Integration:** Google Drive API (Storage/Sync), Gmail API (Dispatch)
* **Auth:** Google OAuth2 (Loopback Redirect)
* **Image Processing:** `Sharp` (Signature Alpha Masking)
* **Currency API:** Frankfurter API (Exchange Rates)
* **PDF Generation:** `webContents.printToPDF`

## 3. System Architecture

The application follows a **Local-First, Cloud-Sync** pattern. All mutations occur on the local SQLite instance first to ensure zero-latency and offline functionality.

### 3.1. Persistence Layer

* **Local:** SQLite handles relational data (Invoices, Clients, Payment Profiles, Signatures).
* **Remote:** Google Drive `appData` folder stores JSON mirrors for sync; a public `Invoices` folder stores generated PDFs.
* **Sync Logic:** Every entity contains an `updatedAt` timestamp and a `UUID`.
* **Reconciliation:** If `remote.updatedAt > local.updatedAt`, the app prompts for conflict resolution.
* **Immutability:** Once `status === 'SENT'`, the record is locked to prevent financial data drift.



### 3.2. PDF & Templating Engine

* **Headless Rendering:** A hidden `BrowserWindow` renders React components styled specifically for A4 (210mm x 297mm).
* **Tax Logic:** Implements **Inclusive Back-Calculation**.
* 
* 


* **Digitized Signature:** Uses a transparency mask utility to convert signature photos into transparent PNG overlays.

## 4. Feature Modules

### 4.1. Currency & Exchange Rates

* Default: `INR`. Support for `USD`, `EUR`.
* Integration: `GET https://api.frankfurter.app/latest?from=USD&to=INR`.
* Fallback: Manual override field for exchange rates if API is unreachable.

### 4.2. Gmail Dispatch & Outbox

* **Scheduling:** Since Gmail API doesn't expose native scheduling to third-party apps, the app implements a **Local Polling Outbox**.
* **Process:**
1. Save email metadata + `scheduledAt` to SQLite.
2. Main process background task checks every 60s.
3. If `currentTime >= scheduledAt` AND internet is active, trigger `gmail.users.messages.send`.



### 4.3. Automated Numbering

* **Algorithm:** `Prefix` + `YYYY` + `SequentialNumber`.
* Sequential numbers are unique and auto-increment based on the highest existing value in the local DB, ensuring continuity regardless of financial year resets.

## 5. Data Schema

```typescript
interface Invoice {
  uuid: string;           // Primary Key
  invoice_no: number;     // Auto-increment
  client_id: string;      // Relation
  status: 'DRAFT' | 'SCHEDULED' | 'SENT';
  currency: 'INR' | 'USD' | 'EUR';
  exchange_rate: number;  // Default 1.0
  total_amount: number;   // Tax inclusive
  tax_rate: number;       // e.g., 0.18
  items: LineItem[];
  email_body: string;     // Template-based
  scheduled_at: number | null;
  updated_at: number;     // Sync anchor
}

interface Signature {
  id: string;
  name: string;
  image_blob: string;     // Processed transparent PNG
}

```

## 6. Antigravity Agent Guidelines

When directing the AI agent to build or modify this project:

* **Constraint:** Prioritize `IPC` communication over `remote` module (deprecated).
* **PDF Styling:** Use `print-color-adjust: exact` in CSS to ensure background colors/borders render in PDFs.
* **Error Handling:** Implement a global `NetworkStatus` provider to queue sync tasks when offline.

---

## 7. Security & Compliance

* **Auth:** OAuth2 tokens stored in system keychain (via `node-keytar` or Electron's `safeStorage`).
* **Data Sovereignty:** Data exists only on the user's machine and their personal Google Drive. No intermediary servers.