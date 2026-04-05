import { getDatabase } from '../index'
import { v4 as uuidv4 } from 'uuid'

export interface EmailTemplate {
    id: string
    name: string
    subject: string
    body: string
    is_default: number
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

export function createEmailTemplate(data: Omit<EmailTemplate, 'id' | 'is_default'>): EmailTemplate {
    const db = getDatabase()
    const id = uuidv4()
    
    db.prepare('INSERT INTO email_templates (id, name, subject, body, is_default) VALUES (?, ?, ?, ?, 0)')
        .run(id, data.name, data.subject, data.body)
        
    return getEmailTemplate(id)!
}

export function updateEmailTemplate(id: string, data: Partial<Omit<EmailTemplate, 'id'>>): boolean {
    const db = getDatabase()
    const fields = Object.keys(data).map(key => `${key} = ?`).join(', ')
    const values = Object.values(data)
    
    if (fields.length === 0) return true
    
    const result = db.prepare(`UPDATE email_templates SET ${fields} WHERE id = ?`).run(...values, id)
    return result.changes > 0
}

export function deleteEmailTemplate(id: string): boolean {
    const db = getDatabase()
    const result = db.prepare('DELETE FROM email_templates WHERE id = ? AND is_default = 0').run(id)
    return result.changes > 0
}

export function setDefaultEmailTemplate(id: string): boolean {
    const db = getDatabase()
    
    const transaction = db.transaction(() => {
        db.prepare('UPDATE email_templates SET is_default = 0').run()
        const result = db.prepare('UPDATE email_templates SET is_default = 1 WHERE id = ?').run(id)
        return result.changes > 0
    })
    
    return transaction()
}
