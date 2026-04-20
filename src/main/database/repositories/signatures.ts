import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '../index'

export interface Signature {
    id: string
    name: string
    image_blob: string // Base64 transparent PNG
    is_default: number
    updated_at?: number
    last_synced_at?: number
    has_conflict?: number
    conflict_data?: string | null
}

export interface CreateSignatureData {
    name: string
    image_blob: string
}

export function getSignatures(): Signature[] {
    const db = getDatabase()
    return db.prepare('SELECT * FROM signatures').all() as Signature[]
}

export function getSignature(id: string): Signature | null {
    const db = getDatabase()
    return db.prepare('SELECT * FROM signatures WHERE id = ?').get(id) as Signature | null
}

export function createSignature(data: CreateSignatureData): Signature {
    const db = getDatabase()
    const id = uuidv4()
    const now = Date.now()

    db.prepare(`
    INSERT INTO signatures (id, name, image_blob, is_default, updated_at)
    VALUES (?, ?, ?, 0, ?)
  `).run(id, data.name, data.image_blob, now)

    // If it's the first signature, make it default automatically
    const count = db.prepare('SELECT COUNT(*) as count FROM signatures').get() as { count: number }
    if (count.count === 1) {
        setDefaultSignature(id)
    }

    const sig = getSignature(id)!
    // Fire-and-forget event-driven push
    import('../../sync/drive-sync').then(m => m.pushSingleRecordToDrive('signatures', sig, 'id')).catch(() => {})
    return sig
}

export function deleteSignature(id: string): boolean {
    const db = getDatabase()
    const result = db.prepare('DELETE FROM signatures WHERE id = ?').run(id)
    return result.changes > 0
}

export function setDefaultSignature(id: string): boolean {
    const db = getDatabase()
    // Reset all
    db.prepare('UPDATE signatures SET is_default = 0').run()
    // Set new default
    const result = db.prepare('UPDATE signatures SET is_default = 1, updated_at = ? WHERE id = ?').run(Date.now(), id)
    return result.changes > 0
}
