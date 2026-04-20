import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '../index'

export interface Client {
    uuid: string
    name: string
    email: string | null
    address: string | null
    gstin: string | null
    updated_at: number
    last_synced_at?: number
    has_conflict?: number
    conflict_data?: string | null
}

export interface CreateClientData {
    name: string
    email?: string
    address?: string
    gstin?: string
}

export function getClients(): Client[] {
    const db = getDatabase()
    return db.prepare('SELECT * FROM clients ORDER BY name ASC').all() as Client[]
}

export function getClient(id: string): Client | null {
    const db = getDatabase()
    return db.prepare('SELECT * FROM clients WHERE uuid = ?').get(id) as Client | null
}

export function createClient(data: CreateClientData): Client {
    const db = getDatabase()
    const uuid = uuidv4()
    const now = Date.now()

    db.prepare(`
    INSERT INTO clients (uuid, name, email, address, gstin, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(uuid, data.name, data.email || null, data.address || null, data.gstin || null, now)

    const newClient = getClient(uuid)!
    // Fire-and-forget event-driven push
    import('../../sync/drive-sync').then(m => m.pushSingleRecordToDrive('clients', newClient, 'uuid')).catch(() => {})
    return newClient
}

export function updateClient(id: string, data: Partial<CreateClientData>): Client | null {
    const db = getDatabase()
    const existing = getClient(id)
    if (!existing) return null

    const updates: string[] = ['updated_at = ?']
    const values: any[] = [Date.now()]

    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name) }
    if (data.email !== undefined) { updates.push('email = ?'); values.push(data.email) }
    if (data.address !== undefined) { updates.push('address = ?'); values.push(data.address) }
    if (data.gstin !== undefined) { updates.push('gstin = ?'); values.push(data.gstin) }
    values.push(id)

    db.prepare(`UPDATE clients SET ${updates.join(', ')} WHERE uuid = ?`).run(...values)

    const updatedClient = getClient(id)
    if (updatedClient) {
        import('../../sync/drive-sync').then(m => m.pushSingleRecordToDrive('clients', updatedClient, 'uuid')).catch(() => {})
    }
    return updatedClient
}

export function deleteClient(id: string): boolean {
    const db = getDatabase()
    const result = db.prepare('DELETE FROM clients WHERE uuid = ?').run(id)
    return result.changes > 0
}
