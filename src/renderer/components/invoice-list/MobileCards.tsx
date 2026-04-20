import { FC } from 'react'
import { Invoice, Client } from './types'
import { canEdit, canMarkPaid, formatDate, formatCurrency } from './ListUtils'
import { IconPencil, IconFile, IconCheckmark, IconCopy } from '../Icons'

interface MobileCardsProps {
    invoices: Invoice[]
    clients: Map<string, Client>
    onAction: (action: string, id: string) => void
}

export const MobileCards: FC<MobileCardsProps> = ({ invoices, clients, onAction }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {invoices.map(inv => (
                <div key={inv.uuid} className="card" onClick={() => onAction('view', inv.uuid)}>
                    <div className="invoice-mobile-row">
                        <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{inv.invoice_no}</span>
                        <span className={`badge badge-${inv.status.toLowerCase()}`}>{inv.status}</span>
                    </div>
                    <div className="invoice-mobile-row" style={{ marginTop: '4px' }}>
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                            {inv.client_id ? (clients.get(inv.client_id)?.name || 'Unknown') : 'No client'}
                        </span>
                        <span style={{ fontWeight: 600 }}>{formatCurrency(inv.total_amount, inv.currency)}</span>
                    </div>
                    <div className="invoice-mobile-row" style={{ marginTop: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>{formatDate(inv.created_at)}</span>
                        <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                            {canEdit(inv.status) && <button onClick={() => onAction('edit', inv.uuid)} className="btn btn-ghost btn-icon btn-sm" data-tooltip="Edit Invoice" data-tooltip-align="right"><IconPencil /></button>}
                            <button onClick={() => onAction('view', inv.uuid)} className="btn btn-ghost btn-icon btn-sm" data-tooltip="View PDF" data-tooltip-align="right"><IconFile /></button>
                            {canMarkPaid(inv.status) && <button onClick={() => onAction('paid', inv.uuid)} className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-success)' }} data-tooltip="Mark Paid" data-tooltip-align="right"><IconCheckmark /></button>}
                            <button onClick={() => onAction('copy', inv.uuid)} className="btn btn-ghost btn-icon btn-sm" data-tooltip="Clone" data-tooltip-align="right"><IconCopy /></button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
