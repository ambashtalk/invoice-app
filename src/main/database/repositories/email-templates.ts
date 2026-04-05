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
}

export function getEmailTemplates(): EmailTemplate[] {
    const db = getDatabase()
    return db.prepare('SELECT * FROM email_templates ORDER BY name ASC').all() as EmailTemplate[]
}

export function getEmailTemplate(id: string): EmailTemplate | null {
    const db = getDatabase()
    return db.prepare('SELECT * FROM email_templates WHERE id = ?').get(id) as EmailTemplate | null
}

export function getDefaultEmailTemplate(): EmailTemplate | null {
    const db = getDatabase()
    return db.prepare('SELECT * FROM email_templates WHERE is_default = 1').get() as EmailTemplate | null
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
    const db = getDatabase()
    const result = db.prepare('DELETE FROM email_templates WHERE id = ? AND is_default = 0').run(id)
    return result.changes > 0
}

export function setDefaultEmailTemplate(id: string): boolean {
    const db = getDatabase()
    const now = Date.now()

    const transaction = db.transaction(() => {
        db.prepare('UPDATE email_templates SET is_default = 0, updated_at = ?').run(now)
        const result = db.prepare('UPDATE email_templates SET is_default = 1, updated_at = ? WHERE id = ?').run(now, id)
        return result.changes > 0
    })

    return transaction()
}

export function resolveEmailTemplateConflict(id: string, resolvedData: any): EmailTemplate {
    const db = getDatabase()
    db.prepare(`
        UPDATE email_templates SET
        name = ?, subject = ?, body = ?, updated_at = ?,
        has_conflict = 0, conflict_data = NULL, last_synced_at = 0
        WHERE id = ?
    `).run(resolvedData.name, resolvedData.subject, resolvedData.body, Date.now(), id)

    const resolved = getEmailTemplate(id)!
    import('../../sync/drive-sync').then(m => m.pushSingleRecordToDrive('email_templates', resolved, 'id')).catch(() => {})
    return resolved
}
