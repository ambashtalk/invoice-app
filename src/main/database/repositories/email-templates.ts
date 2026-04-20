import { getDatabase } from '../index'
import { v4 as uuidv4 } from 'uuid'

export interface EmailTemplate {
    id: string
    name: string
    subject: string
    body: string
    is_default: number
    updated_at?: number
    last_synced_at?: number
    has_conflict?: number
    conflict_data?: string | null
    /** true for the built-in system template — cannot be deleted or set as default */
    is_system?: boolean
}

/**
 * Built-in system template — always available, cannot be deleted.
 * Stored in code, not in the database, so it survives DB wipes.
 */
export const SYSTEM_TEMPLATE: EmailTemplate = {
    id: '__system_standard_invoice__',
    name: '📄 Standard Invoice (System)',
    subject: 'Invoice {{invoice_no}} from {{seller_name}}',
    body: [
        '<p>Dear {{client_name}},</p>',
        '<p>Please find attached <strong>Invoice {{invoice_no}}</strong> for ',
        '<strong>{{total_amount}} {{currency}}</strong>.</p>',
        '<p>Kindly process the payment at your earliest convenience.</p>',
        '<p>If you have any questions or concerns, do not hesitate to reach out.</p>',
        '<p>Thank you for your business!</p>',
        '<p>Warm regards,<br/>{{seller_name}}</p>'
    ].join('\n'),
    is_default: 0,
    is_system: true
}

export function getEmailTemplates(): EmailTemplate[] {
    const db = getDatabase()
    const rows = db.prepare('SELECT * FROM email_templates ORDER BY name ASC').all() as EmailTemplate[]
    // System template always appears first
    return [SYSTEM_TEMPLATE, ...rows]
}

export function getEmailTemplate(id: string): EmailTemplate | null {
    if (id === SYSTEM_TEMPLATE.id) return SYSTEM_TEMPLATE
    const db = getDatabase()
    return db.prepare('SELECT * FROM email_templates WHERE id = ?').get(id) as EmailTemplate | null
}

export function getDefaultEmailTemplate(): EmailTemplate | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM email_templates WHERE is_default = 1').get() as EmailTemplate | null
    // Fall back to system template if no user-defined default exists
    return row ?? SYSTEM_TEMPLATE
}

export function createEmailTemplate(data: Omit<EmailTemplate, 'id' | 'is_default' | 'updated_at' | 'last_synced_at' | 'has_conflict' | 'conflict_data'>): EmailTemplate {
    const db = getDatabase()
    const id = uuidv4()
    const now = Date.now()

    db.prepare('INSERT INTO email_templates (id, name, subject, body, is_default, updated_at) VALUES (?, ?, ?, ?, 0, ?)')
        .run(id, data.name, data.subject, data.body, now)

    const newTemplate = getEmailTemplate(id)!
    // Fire-and-forget event-driven push
    import('../../sync/drive-sync').then(m => m.pushSingleRecordToDrive('email_templates', newTemplate, 'id')).catch(() => {})
    return newTemplate
}

export function updateEmailTemplate(id: string, data: Partial<Omit<EmailTemplate, 'id'>>): boolean {
    const db = getDatabase()
    const now = Date.now()

    // Always bump updated_at
    const updateData = { ...data, updated_at: now }
    const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ')
    const values = Object.values(updateData)

    if (!fields) return true

    const result = db.prepare(`UPDATE email_templates SET ${fields} WHERE id = ?`).run(...values, id)

    if (result.changes > 0) {
        const updatedTemplate = getEmailTemplate(id)
        if (updatedTemplate) {
            import('../../sync/drive-sync').then(m => m.pushSingleRecordToDrive('email_templates', updatedTemplate, 'id')).catch(() => {})
        }
    }
    return result.changes > 0
}

export function deleteEmailTemplate(id: string): boolean {
    if (id === SYSTEM_TEMPLATE.id) return false  // system template cannot be deleted
    const db = getDatabase()
    const result = db.prepare('DELETE FROM email_templates WHERE id = ? AND is_default = 0').run(id)
    return result.changes > 0
}

export function setDefaultEmailTemplate(id: string): boolean {
    if (id === SYSTEM_TEMPLATE.id) return false  // system template cannot be set as DB default
    const db = getDatabase()
    const now = Date.now()

    const transaction = db.transaction(() => {
        db.prepare('UPDATE email_templates SET is_default = 0, updated_at = ?').run(now)
        const result = db.prepare('UPDATE email_templates SET is_default = 1, updated_at = ? WHERE id = ?').run(now, id)
        return result.changes > 0
    })

    return transaction()
}
