import { useState, useEffect } from 'react'
import { useInvoiceList } from '../components/invoice-list/useInvoiceList'
import { ListFilterBar } from '../components/invoice-list/ListFilterBar'
import { DesktopTable } from '../components/invoice-list/ListDesktopTable'
import { MobileCards } from '../components/invoice-list/MobileCards'
import { IconRefresh, IconFilter } from '../components/Icons'

export default function InvoiceList() {
    const vm = useInvoiceList()
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)
    const [showFilters, setShowFilters] = useState(!isMobile)

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024)
        window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize)
    }, [])

    const handleAction = async (action: string, id: string) => {
        if (action === 'edit') vm.navigate(`/invoices/${id}/edit`)
        else if (action === 'view') vm.navigate(`/invoices/${id}`)
        else if (action === 'paid') {
            if (!confirm('Mark as Paid?')) return
            try { await window.electronAPI.markInvoicePaid(id); vm.success('Marked Paid'); vm.loadData(false) } catch (err) { vm.error('Failed') }
        } else if (action === 'cancel') {
            if (!confirm('Cancel invoice?')) return
            try { await window.electronAPI.markInvoiceCancelled(id); vm.success('Cancelled'); vm.loadData(false) } catch (err) { vm.error('Failed') }
        }
    }

    return (
        <div className="container py-lg">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h1 className="h1" style={{ margin: 0 }}>Invoices</h1>
                <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                    <button onClick={() => setShowFilters(!showFilters)} className={`btn btn-secondary ${isMobile ? 'btn-icon' : ''}`} data-tooltip="Toggle Filters">
                        <IconFilter /> {!isMobile && 'Filters'}
                    </button>
                    <button onClick={vm.handleSync} className={`btn btn-secondary ${isMobile ? 'btn-icon' : ''}`} disabled={vm.isRefreshing} data-tooltip="Sync with Drive">
                        <IconRefresh /> {!isMobile && (vm.isRefreshing ? 'Syncing...' : 'Sync Now')}
                    </button>
                    <button onClick={() => vm.navigate('/invoices/new')} className="btn btn-primary">
                        + {isMobile ? 'New' : 'Create Invoice'}
                    </button>
                </div>
            </div>

            {showFilters && <ListFilterBar filters={vm.filters} clients={vm.clients} isMobile={isMobile} onUpdate={u => vm.setFilters(p => ({ ...p, ...u }))} />}

            <div style={{ marginTop: '32px' }}>
                {vm.loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={{ height: '70px', borderRadius: '8px' }} />)}
                    </div>
                ) : vm.filteredInvoices.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '64px' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>No invoices found</div>
                        <div style={{ color: 'var(--color-text-muted)' }}>Try adjusting your search or filters.</div>
                    </div>
                ) : isMobile ? (
                    <MobileCards invoices={vm.filteredInvoices} clients={vm.clients} onAction={handleAction} />
                ) : (
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <DesktopTable invoices={vm.filteredInvoices} clients={vm.clients} filters={vm.filters} onUpdateFilter={u => vm.setFilters(p => ({ ...p, ...u }))} onAction={handleAction} />
                    </div>
                )}
            </div>
        </div>
    )
}
