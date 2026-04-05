import { v4 as uuidv4 } from 'uuid'
import { format } from 'date-fns'
import { getDatabase } from '../index'

export interface LineItem {
    slNo: number
    description: string
    amount: number
}

export interface Invoice {
    uuid: string
    invoice_no: string
    client_id: string | null
    signature_id: string | null
    status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'PAID' | 'CANCELLED'
    currency: 'INR' | 'USD' | 'EUR'
    exchange_rate: number
    total_amount: number
    tax_rate: number
    items: LineItem[]
    email_body: string | null
    scheduled_at: number | null
    created_at: number
    updated_at: number
    last_synced_at: number
    has_conflict: number
    conflict_data: string | null
}

export interface CreateInvoiceData {
    client_id?: string
    signature_id?: string
    currency?: 'INR' | 'USD' | 'EUR'
    exchange_rate?: number
    total_amount: number
    tax_rate?: number
    items: LineItem[]
    email_body?: string
}

function generateInvoiceNumber(): string {
    const db = getDatabase()
    const now = new Date()
    const datePrefix = format(now, 'yyyy/MM/dd')

    // Get the highest sequence number for today
    const result = db
        .prepare(`
      SELECT invoice_no FROM invoices 
      WHERE invoice_no LIKE ? 
      ORDER BY invoice_no DESC 
      LIMIT 1
    `)
        .get(`INV/${datePrefix}/%`) as { invoice_no: string } | undefined

    let sequence = 1
    if (result) {
        const parts = result.invoice_no.split('/')
        const lastSeq = parseInt(parts[parts.length - 1], 10)
        sequence = lastSeq + 1
    }

    return `INV/${datePrefix}/${String(sequence).padStart(3, '0')}`
}

export function getInvoices(): Invoice[] {
    const db = getDatabase()
    const rows = db.prepare('SELECT * FROM invoices ORDER BY created_at DESC').all() as any[]
    return rows.map(row => ({
        ...row,
        items: JSON.parse(row.items)
    }))
}

export function getInvoice(id: string): Invoice | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM invoices WHERE uuid = ?').get(id) as any
    if (!row) return null
    return {
        ...row,
        items: JSON.parse(row.items)
    }
}

export function createInvoice(data: CreateInvoiceData): Invoice {
    const db = getDatabase()
    const now = Date.now()
    const uuid = uuidv4()
    const invoice_no = generateInvoiceNumber()

    const stmt = db.prepare(`
    INSERT INTO invoices (
      uuid, invoice_no, client_id, signature_id, status, currency, exchange_rate,
      total_amount, tax_rate, items, email_body, scheduled_at, created_at, updated_at,
      last_synced_at, has_conflict, conflict_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NULL)
  `)

    stmt.run(
        uuid,
        invoice_no,
        data.client_id || null,
        data.signature_id || null,
        'DRAFT',
        data.currency || 'INR',
        data.exchange_rate || 1.0,
        data.total_amount,
        data.tax_rate || 0.18,
        JSON.stringify(data.items),
        data.email_body || null,
        null,
        now,
        now
    )

    const newInv = getInvoice(uuid)!
    
    // Background single sync
    import('../../sync/drive-sync').then(m => m.pushSingleInvoiceToDrive(newInv)).catch(() => {})

    return newInv
}

export function updateInvoice(id: string, data: Partial<CreateInvoiceData>): Invoice | null {
    const db = getDatabase()
    const existing = getInvoice(id)

    if (!existing) return null

    // Prevent updates to non-draft invoices (immutability rule)
    if (existing.status !== 'DRAFT') {
        throw new Error(`Cannot modify a ${existing.status} invoice`)
    }

    const updates: string[] = ['updated_at = ?']
    const values: any[] = [Date.now()]

    if (data.client_id !== undefined) {
        updates.push('client_id = ?')
        values.push(data.client_id)
    }
    if (data.signature_id !== undefined) {
        updates.push('signature_id = ?')
        values.push(data.signature_id)
    }
    if (data.currency !== undefined) {
        updates.push('currency = ?')
        values.push(data.currency)
    }
    if (data.exchange_rate !== undefined) {
        updates.push('exchange_rate = ?')
        values.push(data.exchange_rate)
    }
    if (data.total_amount !== undefined) {
        updates.push('total_amount = ?')
        values.push(data.total_amount)
    }
    if (data.tax_rate !== undefined) {
        updates.push('tax_rate = ?')
        values.push(data.tax_rate)
    }
    if (data.items !== undefined) {
        updates.push('items = ?')
        values.push(JSON.stringify(data.items))
    }
    if (data.email_body !== undefined) {
        updates.push('email_body = ?')
        values.push(data.email_body)
    }

    values.push(id)

    db.prepare(`UPDATE invoices SET ${updates.join(', ')} WHERE uuid = ?`).run(...values)

    const updatedInv = getInvoice(id)
    if (updatedInv) {
        import('../../sync/drive-sync').then(m => m.pushSingleInvoiceToDrive(updatedInv)).catch(() => {})
    }
    
    return updatedInv
}

export function deleteInvoice(id: string): boolean {
    const db = getDatabase()
    const existing = getInvoice(id)

    if (!existing) return false

    // Prevent deletion of non-draft invoices
    if (existing.status !== 'DRAFT') {
        throw new Error(`Cannot delete a ${existing.status} invoice`)
    }

    db.prepare('DELETE FROM invoices WHERE uuid = ?').run(id)
    return true
}

export function updateInvoiceStatus(id: string, status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'PAID' | 'CANCELLED'): Invoice | null {
    const db = getDatabase()
    db.prepare('UPDATE invoices SET status = ?, updated_at = ? WHERE uuid = ?').run(status, Date.now(), id)
    
    const updatedInv = getInvoice(id)
    if (updatedInv) {
        import('../../sync/drive-sync').then(m => m.pushSingleInvoiceToDrive(updatedInv)).catch(() => {})
    }
    return updatedInv
}

export function markAsPaid(id: string): Invoice | null {
    return updateInvoiceStatus(id, 'PAID')
}

export function markAsCancelled(id: string): Invoice | null {
    return updateInvoiceStatus(id, 'CANCELLED')
}

export function upsertInvoiceFromSync(data: any): Invoice {
    const db = getDatabase()
    const existing = db.prepare('SELECT uuid FROM invoices WHERE uuid = ?').get(data.uuid)
    
    // We expect `data.items` to be an array from parsed JSON remote sync. 
    // We must stringify it for the sqlite column.
    const itemsRaw = typeof data.items === 'string' ? data.items : JSON.stringify(data.items || [])

    if (existing) {
        db.prepare(`
            UPDATE invoices SET
            invoice_no = ?, client_id = ?, signature_id = ?, status = ?, currency = ?, exchange_rate = ?,
            total_amount = ?, tax_rate = ?, items = ?, email_body = ?, scheduled_at = ?, created_at = ?, updated_at = ?, last_synced_at = ?, has_conflict = 0, conflict_data = NULL
            WHERE uuid = ?
        `).run(
            data.invoice_no, data.client_id, data.signature_id, data.status, data.currency, data.exchange_rate,
            data.total_amount, data.tax_rate, itemsRaw, data.email_body, data.scheduled_at, data.created_at, data.updated_at, data.updated_at,
            data.uuid
        )
    } else {
        db.prepare(`
            INSERT INTO invoices (
            uuid, invoice_no, client_id, signature_id, status, currency, exchange_rate,
            total_amount, tax_rate, items, email_body, scheduled_at, created_at, updated_at, last_synced_at, has_conflict, conflict_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)
        `).run(
            data.uuid, data.invoice_no, data.client_id, data.signature_id, data.status, data.currency, data.exchange_rate,
            data.total_amount, data.tax_rate, itemsRaw, data.email_body, data.scheduled_at, data.created_at, data.updated_at, data.updated_at
        )
    }
    return getInvoice(data.uuid)!
}

export function logSyncConflict(uuid: string, remoteData: any): void {
    const db = getDatabase()
    db.prepare('UPDATE invoices SET has_conflict = 1, conflict_data = ? WHERE uuid = ?').run(
        JSON.stringify(remoteData),
        uuid
    )
}

export function markInvoiceSynced(uuid: string, syncedTime: number): void {
    const db = getDatabase()
    db.prepare('UPDATE invoices SET last_synced_at = ? WHERE uuid = ?').run(syncedTime, uuid)
}

export function resolveInvoiceConflict(uuid: string, resolvedData: any): Invoice {
    const db = getDatabase()
    const itemsRaw = typeof resolvedData.items === 'string' ? resolvedData.items : JSON.stringify(resolvedData.items || [])
    
    // Update the local data with the strictly resolved data, set has_conflict = 0, conflict_data = NULL
    db.prepare(`
        UPDATE invoices SET
        client_id = ?, signature_id = ?, currency = ?, exchange_rate = ?,
        total_amount = ?, tax_rate = ?, items = ?, email_body = ?, scheduled_at = ?, updated_at = ?,
        has_conflict = 0, conflict_data = NULL, last_synced_at = ?
        WHERE uuid = ?
    `).run(
        resolvedData.client_id, resolvedData.signature_id, resolvedData.currency, resolvedData.exchange_rate,
        resolvedData.total_amount, resolvedData.tax_rate, itemsRaw, resolvedData.email_body, resolvedData.scheduled_at, Date.now(),
        0, // Set last_synced_at to 0 so it will push on next sync natively
        uuid
    )
    
    const resolvedInv = getInvoice(uuid)!
    import('../../sync/drive-sync').then(m => m.pushSingleInvoiceToDrive(resolvedInv)).catch(() => {})
    
    return resolvedInv
}
