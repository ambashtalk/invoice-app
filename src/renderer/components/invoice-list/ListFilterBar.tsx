import { FC } from 'react'
import { BaseInput } from '../BaseInput'
import { BaseDropdown } from '../BaseDropdown'
import { ListFilters, Client } from './types'

interface ListFilterBarProps {
    filters: ListFilters
    clients: Map<string, Client>
    isMobile: boolean
    onUpdate: (updates: Partial<ListFilters>) => void
}

export const ListFilterBar: FC<ListFilterBarProps> = ({
    filters,
    clients,
    isMobile,
    onUpdate
}) => {
    return (
        <div className="card" style={{ marginTop: isMobile ? '8px' : '24px', padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1.2fr 1.2fr 1fr 0.5fr', gap: '16px', alignItems: 'flex-end' }}>
                <BaseInput 
                    placeholder="Invoice No..." 
                    value={filters.search} 
                    onChange={(v: string) => onUpdate({ search: v })} 
                    style={{ margin: 0 }} 
                    noMargin 
                />
                <BaseDropdown 
                    label="Status" 
                    options={[{ label: 'Draft', value: 'DRAFT' }, { label: 'Scheduled', value: 'SCHEDULED' }, { label: 'Sent', value: 'SENT' }, { label: 'Paid', value: 'PAID' }, { label: 'Cancelled', value: 'CANCELLED' }]} 
                    selected={filters.statuses} 
                    onChange={(v: any) => onUpdate({ statuses: v })} 
                    multi 
                    noMargin 
                />
                <BaseDropdown 
                    label="Client" 
                    options={Array.from(clients.values()).map(c => ({ label: c.name, value: c.uuid }))} 
                    selected={filters.clientIds} 
                    onChange={(v: any) => onUpdate({ clientIds: v })} 
                    multi 
                    noMargin 
                />
                <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
                    <label className="form-label" style={{ marginBottom: '8px' }}>Amount Range</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <BaseInput placeholder="Min" type="number" value={filters.min} onChange={(v: string) => onUpdate({ min: v })} style={{ margin: 0 }} noMargin />
                        <span style={{ color: 'var(--color-text-muted)' }}>-</span>
                        <BaseInput placeholder="Max" type="number" value={filters.max} onChange={(v: string) => onUpdate({ max: v })} style={{ margin: 0 }} noMargin />
                    </div>
                </div>
                <button 
                    onClick={() => onUpdate({ search: '', statuses: ['DRAFT', 'SCHEDULED', 'SENT', 'PAID', 'CANCELLED'], clientIds: [], min: '', max: '' })} 
                    className="btn btn-ghost btn-sm"
                    style={{ height: '42px' }}
                >
                    Reset
                </button>
            </div>
        </div>
    )
}
