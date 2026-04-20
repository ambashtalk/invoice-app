import { getDatabase } from '../index'

export interface ReceivedByMonth {
    month: string
    clientName: string
    total_including_tax: number
}

export function getReceivedByMonth(): ReceivedByMonth[] {
    const db = getDatabase()
    
    // Sum total_amount for PAID invoices grouped by Month and Client
    // created_at is stored in milliseconds
    const stmt = db.prepare(`
        SELECT 
            STRFTIME('%Y-%m', created_at / 1000, 'unixepoch') as month,
            c.name as clientName,
            SUM(i.total_amount) as total_including_tax
        FROM invoices i
        JOIN clients c ON i.client_id = c.uuid
        WHERE i.status = 'PAID'
        GROUP BY month, clientName
        ORDER BY month DESC, clientName ASC
    `)

    return stmt.all() as ReceivedByMonth[]
}
