import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.')
    }
    return db
}

export function initDatabase(): void {
    const dbPath = join(app.getPath('userData'), 'invoice-app.db')
    db = new Database(dbPath)

    // Foreign keys are disabled for simpler schema management as requested
    db.pragma('foreign_keys = OFF')

    // Run migrations
    runMigrations()
}

function runMigrations(): void {
    const database = getDatabase()

    // Ensure the table exists before attempting migrations
    const tableExists = database
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='invoices'")
        .get()

    if (!tableExists) {
        database.exec(getInlineSchema())
        return
    }

    // Migration for signatures table (is_default)
    try {
        const sigInfo = database.pragma("table_info('signatures')") as any[]
        const hasIsDefault = sigInfo.some((c: any) => c.name === 'is_default')
        if (!hasIsDefault) {
            database.exec("ALTER TABLE signatures ADD COLUMN is_default INTEGER DEFAULT 0")
        }
    } catch (error) {
        console.error('Signatures migration failed:', error)
    }

    // Migration for invoices table (signature_id)
    try {
        const info = database.pragma("table_info('invoices')") as any[]
        const hasSigId = info.some((c: any) => c.name === 'signature_id')
        if (!hasSigId) {
            database.exec("ALTER TABLE invoices ADD COLUMN signature_id TEXT")
        }
    } catch (error) {
        console.error('Invoices sig_id migration failed:', error)
    }

    // Migration for PAID/CANCELLED statuses and Removal of Foreign Keys
    try {
        const tableInfo = database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='invoices'").get() as { sql: string }
        const outboxInfo = database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='outbox'").get() as { sql: string }
        
        // Migrate invoices if it still has old status constraints or old schema
        if (tableInfo && (!tableInfo.sql.includes('PAID') || tableInfo.sql.includes('REFERENCES'))) {
            console.log('Migrating invoices (statuses & No-FK policy)...')
            database.transaction(() => {
                database.exec(`
                    CREATE TABLE invoices_new (
                        uuid TEXT PRIMARY KEY,
                        invoice_no TEXT UNIQUE NOT NULL,
                        client_id TEXT, -- fk: clients(uuid)
                        signature_id TEXT,
                        status TEXT CHECK(status IN ('DRAFT', 'SCHEDULED', 'SENT', 'PAID', 'CANCELLED')) DEFAULT 'DRAFT',
                        currency TEXT CHECK(currency IN ('INR', 'USD', 'EUR')) DEFAULT 'INR',
                        exchange_rate REAL DEFAULT 1.0,
                        total_amount REAL NOT NULL,
                        tax_rate REAL CHECK(tax_rate IN (0.05, 0.12, 0.18, 0.28)) DEFAULT 0.18,
                        items TEXT NOT NULL,
                        email_body TEXT,
                        scheduled_at INTEGER,
                        created_at INTEGER NOT NULL,
                        updated_at INTEGER NOT NULL
                    )
                `)
                database.exec(`
                    INSERT INTO invoices_new (
                        uuid, invoice_no, client_id, signature_id, status, 
                        currency, exchange_rate, total_amount, tax_rate, 
                        items, email_body, scheduled_at, created_at, updated_at
                    ) 
                    SELECT 
                        uuid, invoice_no, client_id, signature_id, status, 
                        currency, exchange_rate, total_amount, tax_rate, 
                        items, email_body, scheduled_at, created_at, updated_at
                    FROM invoices
                `)
                database.exec(`DROP TABLE invoices`)
                database.exec(`ALTER TABLE invoices_new RENAME TO invoices`)
                database.exec(`CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`)
                database.exec(`CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id)`)
            })()
        }

        // Migrate outbox to remove foreign key to invoices
        if (outboxInfo && outboxInfo.sql.includes('REFERENCES')) {
            console.log('Migrating outbox (No-FK policy)...')
            database.transaction(() => {
                database.exec(`
                    CREATE TABLE outbox_new (
                        id TEXT PRIMARY KEY,
                        invoice_id TEXT, -- fk: invoices(uuid)
                        recipient_email TEXT NOT NULL,
                        subject TEXT,
                        body TEXT,
                        scheduled_at INTEGER NOT NULL,
                        sent_at INTEGER,
                        status TEXT CHECK(status IN ('PENDING', 'SENT', 'FAILED')) DEFAULT 'PENDING',
                        error_message TEXT
                    )
                `)
                database.exec(`INSERT INTO outbox_new SELECT * FROM outbox`)
                database.exec(`DROP TABLE outbox`)
                database.exec(`ALTER TABLE outbox_new RENAME TO outbox`)
                database.exec(`CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox(status)`)
            })()
        }
    } catch (error) {
        console.error('Database migration failed:', error)
    }
}

function getInlineSchema(): string {
    return `
    CREATE TABLE IF NOT EXISTS clients (
      uuid TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      address TEXT,
      gstin TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoices (
      uuid TEXT PRIMARY KEY,
      invoice_no TEXT UNIQUE NOT NULL,
      client_id TEXT, -- fk: clients(uuid)
      signature_id TEXT,
      status TEXT CHECK(status IN ('DRAFT', 'SCHEDULED', 'SENT', 'PAID', 'CANCELLED')) DEFAULT 'DRAFT',
      currency TEXT CHECK(currency IN ('INR', 'USD', 'EUR')) DEFAULT 'INR',
      exchange_rate REAL DEFAULT 1.0,
      total_amount REAL NOT NULL,
      tax_rate REAL CHECK(tax_rate IN (0.05, 0.12, 0.18, 0.28)) DEFAULT 0.18,
      items TEXT NOT NULL,
      email_body TEXT,
      scheduled_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS signatures (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      image_blob TEXT NOT NULL,
      is_default INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS payment_profiles (
      id TEXT PRIMARY KEY,
      beneficiary_name TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      account_type TEXT DEFAULT 'Savings Account',
      branch TEXT,
      ifsc_code TEXT,
      account_number TEXT NOT NULL,
      is_default INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY,
      invoice_id TEXT, -- fk: invoices(uuid)
      recipient_email TEXT NOT NULL,
      subject TEXT,
      body TEXT,
      scheduled_at INTEGER NOT NULL,
      sent_at INTEGER,
      status TEXT CHECK(status IN ('PENDING', 'SENT', 'FAILED')) DEFAULT 'PENDING',
      error_message TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
    CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox(status);
  `
}

export function closeDatabase(): void {
    if (db) {
        db.close()
        db = null
    }
}
