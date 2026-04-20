export const canEdit = (status: string) => status === 'DRAFT'
export const canDelete = (status: string) => status === 'DRAFT'
export const canModifySchedule = (status: string) => status === 'SCHEDULED'
export const canCancelSchedule = (status: string) => status === 'SCHEDULED'
export const canMarkPaid = (status: string) => ['SENT', 'SCHEDULED'].includes(status)
export const canResend = (status: string) => status === 'SENT'
export const canCancelInvoice = (status: string) => ['DRAFT', 'SENT', 'PAID'].includes(status)

export function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString()
}

export function formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency }).format(amount)
}
