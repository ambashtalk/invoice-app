export interface LineItem {
    slNo: number
    description: string
    amount: number
    tax_rate: number
    show_sgst_cgst: boolean
}

export interface Client {
    uuid: string
    name: string
    email: string | null
}

export interface Signature {
    id: string
    name: string
    is_default: number
}

export interface FormData {
    client_id: string
    signature_id: string
    currency: 'INR' | 'USD' | 'EUR'
    tax_rate: number
    items: LineItem[]
    email_body: string
}

export const TAX_RATES = [
    { value: 0, label: '0% (No GST)' },
    { value: 0.05, label: '5% GST' },
    { value: 0.12, label: '12% GST' },
    { value: 0.18, label: '18% GST' },
    { value: 0.28, label: '28% GST' },
    { value: 0.40, label: '40% GST' }
]
