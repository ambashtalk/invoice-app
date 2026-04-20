export interface Invoice {
    uuid: string
    invoice_no: string
    client_id: string | null
    status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'PAID' | 'CANCELLED'
    currency: 'INR' | 'USD' | 'EUR'
    total_amount: number
    created_at: number
    updated_at: number
    scheduled_at: number | null
}

export interface Client {
    uuid: string
    name: string
    email: string | null
}

export interface ListFilters {
    search: string
    statuses: string[]
    clientIds: string[]
    min: string
    max: string
    sortKey: keyof Invoice | 'client_name'
    sortOrder: 'asc' | 'desc' | null
}
