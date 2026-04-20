import { FC } from 'react'
import { Invoice, Client, ListFilters } from './types'
import { canEdit, canMarkPaid, canCancelInvoice, formatCurrency } from './ListUtils'
import { IconPencil, IconFile, IconCheckmark, IconTrash } from '../Icons'

interface DesktopTableProps {
    invoices: Invoice[]
    clients: Map<string, Client>
    filters: ListFilters
    onUpdateFilter: (updates: Partial<ListFilters>) => void
    onAction: (action: string, id: string) => void
}

export const DesktopTable: FC<DesktopTableProps> = ({ invoices, clients, filters, onUpdateFilter, onAction }) => {
    const handleSort = (key: keyof Invoice | 'client_name') => {
        const order = (filters.sortKey === key && filters.sortOrder === 'desc') ? 'asc' : 'desc'
        onUpdateFilter({ sortKey: key, sortOrder: order })
    }

    return (
        <table className="table">
            <thead>
                <tr>
                    <th onClick={() => handleSort('invoice_no')} style={{ cursor: 'pointer' }} data-tooltip="Sort by Invoice Number">Inv No.</th>
                    <th onClick={() => handleSort('client_name')} style={{ cursor: 'pointer' }} data-tooltip="Sort by Client Name">Client</th>
                    <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }} data-tooltip="Sort by Status">Status</th>
                    <th onClick={() => handleSort('total_amount')} style={{ cursor: 'pointer', textAlign: 'right' }} data-tooltip="Sort by Total Amount">Amount</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
            </thead>
            <tbody>
                {invoices.map(inv => (
                    <tr key={inv.uuid} className="table-row-hover" onClick={() => onAction('view', inv.uuid)}>
                        <td style={{ fontWeight: 600 }}>{inv.invoice_no}</td>
                        <td>{inv.client_id ? (clients.get(inv.client_id)?.name || 'Unknown') : 'No client'}</td>
                        <td><span className={`badge badge-${inv.status.toLowerCase()}`}>{inv.status}</span></td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(inv.total_amount, inv.currency)}</td>
                        <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                {canEdit(inv.status) && <button onClick={() => onAction('edit', inv.uuid)} className="btn btn-ghost btn-icon btn-sm" data-tooltip="Edit Invoice" data-tooltip-align="right"><IconPencil /></button>}
                                <button onClick={() => onAction('view', inv.uuid)} className="btn btn-ghost btn-icon btn-sm" data-tooltip="View PDF" data-tooltip-align="right"><IconFile /></button>
                                {canMarkPaid(inv.status) && <button onClick={() => onAction('paid', inv.uuid)} className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-success)' }} data-tooltip="Mark Paid" data-tooltip-align="right"><IconCheckmark /></button>}
                                {canCancelInvoice(inv.status) && <button onClick={() => onAction('cancel', inv.uuid)} className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-error)' }} data-tooltip="Void" data-tooltip-align="right"><IconTrash /></button>}
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}
