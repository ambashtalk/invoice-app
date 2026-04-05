import { useState, useEffect, useMemo, FC } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { BaseInput } from '../components/BaseInput'
import { BaseDropdown } from '../components/BaseDropdown'

interface Invoice {
    uuid: string
    invoice_no: string
    client_id: string | null
    status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'PAID' | 'CANCELLED'
    currency: 'INR' | 'USD' | 'EUR'
    total_amount: number
    created_at: number
    updated_at: number
    scheduled_at: number | null
    has_conflict: number
}

interface Client {
    uuid: string
    name: string
    email: string | null
}

const ITEMS_PER_PAGE = 10

// --- Components ---

const IconPencil: FC = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
    </svg>
)

const IconFile: FC = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
)

const IconCalendar: FC = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
)

const IconCheckmark: FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
)

const IconSend: FC = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
)

const IconResend: FC = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
)

const IconCopy: FC = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
)

const IconTrash: FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
)

const IconXCircle: FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
)

const IconRefresh: FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
)

const IconFilter: FC = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
)

const SortIcon: FC<{ order: 'asc' | 'desc' | null }> = ({ order }) => (
    <div style={{ width: '20px', display: 'inline-flex', justifyContent: 'center', color: order ? 'var(--color-primary)' : 'var(--color-text-muted)', opacity: order ? 1 : 0.3 }}>
        {order === 'asc' ? '↑' : order === 'desc' ? '↓' : '↕'}
    </div>
)

// --- Logic Guardians ---
const canEdit = (status: string) => status === 'DRAFT'
const canDelete = (status: string) => status === 'DRAFT'
const canModifySchedule = (status: string) => status === 'SCHEDULED'
const canCancelSchedule = (status: string) => status === 'SCHEDULED'
const canMarkPaid = (status: string) => ['SENT', 'SCHEDULED'].includes(status)
const canResend = (status: string) => status === 'SENT'
// SCHEDULED is intentionally excluded — cancel the schedule first (back to DRAFT), then void
const canCancelInvoice = (status: string) => ['DRAFT', 'SENT'].includes(status)

// --- Main Component ---

export default function InvoiceList() {
    const navigate = useNavigate()
    const { success, error, warning, info } = useToast()
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [clients, setClients] = useState<Map<string, Client>>(new Map())
    const [loading, setLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
    const [showFilters, setShowFilters] = useState(false)
    
    // Consolidated Filter State
    const STORAGE_KEY = 'automate_invoice_filters'
    
    const initialFilters = useMemo(() => {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            try {
                return JSON.parse(saved)
            } catch (e) {
                console.error('Failed to parse saved filters', e)
            }
        }
        return {
            search: '',
            statuses: ['DRAFT', 'SCHEDULED', 'SENT', 'PAID', 'CANCELLED'],
            clientIds: [] as string[],
            min: '',
            max: '',
            sortKey: 'created_at' as keyof Invoice | 'client_name',
            sortOrder: 'desc' as 'asc' | 'desc' | null
        }
    }, [])

    const [filters, setFilters] = useState(initialFilters)

    // Persist filters on change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
    }, [filters])
    const [currentPage, setCurrentPage] = useState(1)
    const [jumpPage, setJumpPage] = useState('')

    // Quick Send State
    const [quickSendInvoice, setQuickSendInvoice] = useState<Invoice | null>(null)
    const [quickSendEmail, setQuickSendEmail] = useState('')
    const [isSending, setIsSending] = useState(false)

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768)
        window.addEventListener('resize', handleResize)
        loadData()
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    async function loadData(showLoader = true) {
        if (showLoader) setLoading(true)
        setIsRefreshing(true)

        try {
            const [invoicesData, clientsData] = await Promise.all([
                window.electronAPI.getInvoices(),
                window.electronAPI.getClients()
            ])
            setInvoices(invoicesData)
            const clientMap = new Map<string, Client>(clientsData.map((c: Client) => [c.uuid, c]))
            setClients(clientMap)
            
            if (filters.clientIds.length === 0) {
                setFilters((f: any) => ({ ...f, clientIds: clientsData.map((c: Client) => c.uuid) }))
            }
        } catch (err) {
            error('Failed to load invoices')
        } finally {
            setLoading(false)
            setIsRefreshing(false)
        }
    }

    const processedInvoices = useMemo(() => {
        let result = [...invoices]

        if (filters.search) result = result.filter(inv => inv.invoice_no.toLowerCase().includes(filters.search.toLowerCase()))
        if (filters.statuses.length > 0 && filters.statuses.length < 6) {
            result = result.filter(inv => {
                const isConflictFilter = filters.statuses.includes('CONFLICTS')
                if (isConflictFilter && inv.has_conflict) return true
                return filters.statuses.includes(inv.status)
            })
        }
        if (filters.clientIds.length < clients.size) result = result.filter(inv => inv.client_id && filters.clientIds.includes(inv.client_id))
        if (filters.min) result = result.filter(inv => inv.total_amount >= parseFloat(filters.min))
        if (filters.max) result = result.filter(inv => inv.total_amount <= parseFloat(filters.max))

        if (filters.sortOrder) {
            result.sort((a, b) => {
                let valA: any, valB: any;
                if (filters.sortKey === 'client_name') {
                    valA = a.client_id ? (clients.get(a.client_id)?.name || '') : ''
                    valB = b.client_id ? (clients.get(b.client_id)?.name || '') : ''
                } else {
                    valA = a[filters.sortKey as keyof Invoice]
                    valB = b[filters.sortKey as keyof Invoice]
                }
                if (valA < valB) return filters.sortOrder === 'asc' ? -1 : 1
                if (valA > valB) return filters.sortOrder === 'asc' ? 1 : -1
                return 0
            })
        }

        return result
    }, [invoices, filters, clients])

    const totalPages = Math.ceil(processedInvoices.length / ITEMS_PER_PAGE)
    const paginatedInvoices = processedInvoices.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

    useEffect(() => { setCurrentPage(1) }, [filters])

    const resetFilters = () => {
        setFilters({ ...initialFilters, clientIds: Array.from(clients.keys()) })
        setShowFilters(false)
    }

    const updateFilter = (key: string, value: any) => {
        setFilters((f: any) => ({ ...f, [key]: value }))
    }

    function toggleSort(key: typeof filters.sortKey) {
        setFilters((f: any) => {
            if (f.sortKey === key) {
                if (f.sortOrder === 'desc') return { ...f, sortOrder: 'asc' }
                if (f.sortOrder === 'asc') return { ...f, sortOrder: null }
                return { ...f, sortOrder: 'desc' }
            }
            return { ...f, sortKey: key, sortOrder: 'desc' }
        })
    }

    async function handleQuickSend(e: React.FormEvent) {
        e.preventDefault()
        if (!quickSendInvoice || !quickSendEmail) return
        setIsSending(true)
        try {
            const scheduledAt = Date.now() + 10000 // 10s buffer
            
            let subject = `Invoice ${quickSendInvoice.invoice_no}`
            let body = `Please find attached Invoice ${quickSendInvoice.invoice_no}. Thank you!`
            
            const [defaultTemplate, sellerInfo] = await Promise.all([
                window.electronAPI.getDefaultEmailTemplate(),
                window.electronAPI.getSellerInfo()
            ])

            if (defaultTemplate) {
                const client = clients.get(quickSendInvoice.client_id || '')
                const placeholders: Record<string, string> = {
                    '{{invoice_no}}': quickSendInvoice.invoice_no || '',
                    '{{client_name}}': client?.name || 'Customer',
                    '{{total_amount}}': quickSendInvoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                    '{{currency}}': quickSendInvoice.currency || '',
                    '{{seller_name}}': sellerInfo?.name || ''
                }
                
                subject = defaultTemplate.subject
                body = defaultTemplate.body
                
                Object.entries(placeholders).forEach(([key, value]) => {
                    subject = subject.replace(new RegExp(key, 'g'), value)
                    body = body.replace(new RegExp(key, 'g'), value)
                })
            }

            await window.electronAPI.scheduleInvoice(quickSendInvoice.uuid, quickSendEmail, scheduledAt, subject, body)
            
            warning(`Sending invoice in 10s...`, {
                label: 'Undo',
                onClick: () => handleCancelSchedule(quickSendInvoice.uuid, false)
            })

            setQuickSendInvoice(null)
            loadData(false)
        } catch (err) { 
            console.error('Quick send failed:', err)
            error('Quick send failed') 
        } finally { setIsSending(false) }
    }

    async function handleCancelSchedule(invoiceId: string, confirmNeeded: boolean = true) {
        if (confirmNeeded && !confirm('Cancel the scheduled email?')) return
        try {
            await window.electronAPI.cancelScheduledInvoice(invoiceId)
            if (!confirmNeeded) info('Send cancelled.')
            else success('Schedule cancelled.')
            loadData(false)
        } catch (err) { error('Failed to cancel') }
    }

    async function handleMarkPaid(id: string) {
        if (!confirm('Mark this invoice as Paid?')) return
        try {
            await window.electronAPI.markInvoicePaid(id)
            success('Invoice marked as Paid.')
            loadData()
        } catch (err: any) { error(err.message) }
    }

    async function handleMarkCancelled(id: string) {
        if (!confirm('Are you sure you want to cancel this invoice? This action cannot be undone.')) return
        try {
            await window.electronAPI.markInvoiceCancelled(id)
            success('Invoice cancelled.')
            loadData()
        } catch (err: any) { error(err.message) }
    }

    async function handleDelete(id: string) {
        if (!confirm('Permanent delete this draft?')) return
        try {
            await window.electronAPI.deleteInvoice(id)
            success('Invoice deleted.')
            loadData()
        } catch (err: any) { error(err.message) }
    }

    async function handleDuplicate(id: string) {
        setLoading(true)
        try {
            const source = await window.electronAPI.getInvoice(id)
            if (source) {
                const data = {
                    client_id: source.client_id || undefined,
                    signature_id: source.signature_id || undefined,
                    currency: source.currency,
                    tax_rate: source.tax_rate,
                    total_amount: source.total_amount,
                    items: source.items,
                    email_body: source.email_body || undefined
                }
                await window.electronAPI.createInvoice(data)
                success('Invoice duplicated.')
                await loadData()
            }
        } catch (err) { error('Duplication failed.') } finally { setLoading(false) }
    }

    const handleJumpPage = (e: React.FormEvent) => {
        e.preventDefault()
        const p = parseInt(jumpPage)
        if (p >= 1 && p <= totalPages) {
            setCurrentPage(p)
            setJumpPage('')
        } else {
            error(`Invalid page number. Max: ${totalPages}`)
        }
    }

    const pageNumbers = useMemo(() => {
        const range = []
        const start = Math.max(1, currentPage - 2)
        const end = Math.min(totalPages, currentPage + 2)
        for (let i = start; i <= end; i++) range.push(i)
        return range
    }, [currentPage, totalPages])

    function formatCurrency(amount: number, currency: string) {
        return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
    }

    if (loading) return <div className="empty-state"><p className="empty-state-description">Loading...</p></div>

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Page Header */}
            <div style={{ flexShrink: 0, paddingBottom: isMobile ? '16px' : '24px' }}>
                <div className="page-header" style={{ padding: '0 0 16px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <div>
                        <h1 className="page-title">Invoices</h1>
                        {!isMobile && <p className="page-subtitle">Track your professional finances</p>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => loadData()} className={`btn btn-secondary ${isRefreshing ? 'is-spinning' : ''}`} style={{ padding: '0 12px' }}><IconRefresh /></button>
                        {isMobile && <button onClick={() => setShowFilters(!showFilters)} className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0 12px' }}><IconFilter /></button>}
                        <Link to="/invoices/new" className="btn btn-primary">{isMobile ? '+' : 'New Invoice'}</Link>
                    </div>
                </div>

                {/* Filters */}
                {(showFilters || !isMobile) && (
                    <div className="card" style={{ marginTop: isMobile ? '8px' : '24px', padding: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1.2fr 1.2fr 1fr 0.5fr', gap: '16px', alignItems: 'flex-end' }}>
                            <BaseInput placeholder="Invoice No..." value={filters.search} onChange={(v: string) => updateFilter('search', v)} style={{ margin: 0 }} noMargin />
                            <BaseDropdown label="Status" options={[{ label: 'Draft', value: 'DRAFT' }, { label: 'Scheduled', value: 'SCHEDULED' }, { label: 'Sent', value: 'SENT' }, { label: 'Paid', value: 'PAID' }, { label: 'Cancelled', value: 'CANCELLED' }, { label: '⚠️ Conflicts', value: 'CONFLICTS' }]} selected={filters.statuses} onChange={(v: any) => updateFilter('statuses', v)} multi noMargin />
                            <BaseDropdown label="Client" options={Array.from(clients.values()).map(c => ({ label: c.name, value: c.uuid }))} selected={filters.clientIds} onChange={(v: any) => updateFilter('clientIds', v)} multi noMargin />
                            <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
                                <label className="form-label" style={{ marginBottom: '8px' }}>Amount Range</label>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <BaseInput type="number" placeholder="Min" value={filters.min} onChange={(v: string) => updateFilter('min', v)} style={{ margin: 0 }} noMargin />
                                    <BaseInput type="number" placeholder="Max" value={filters.max} onChange={(v: string) => updateFilter('max', v)} style={{ margin: 0 }} noMargin />
                                </div>
                            </div>
                            <button onClick={resetFilters} className="btn btn-ghost btn-sm" style={{ width: '100%', height: '44px', marginBottom: '0' }}>Reset</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Data Area */}
            <div className="card" style={{ flex: 1, overflow: 'auto', padding: 0, border: 'none', position: 'relative' }}>
                {processedInvoices.length === 0 ? (
                    <div className="empty-state"><h3>No results found</h3></div>
                ) : isMobile ? (
                    /* Mobile Card View */
                    <div style={{ padding: '4px' }}>
                        {paginatedInvoices.map((inv) => (
                            <div 
                                key={inv.uuid} 
                                className="invoice-mobile-card" 
                                onClick={() => navigate(`/invoices/${inv.uuid}`)}
                            >
                                <div className="invoice-mobile-row">
                                    <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>{inv.invoice_no}</span>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        {inv.has_conflict === 1 && <span className="badge" style={{ background: 'var(--color-error)', color: '#fff' }}>⚠️ Requires Review</span>}
                                        <span className={`badge badge-${inv.status.toLowerCase()}`}>{inv.status}</span>
                                    </div>
                                </div>
                                <div className="invoice-mobile-row">
                                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                                        {inv.client_id ? (clients.get(inv.client_id)?.name || 'Unknown') : 'No client'}
                                    </span>
                                    <span style={{ fontWeight: 600 }}>{formatCurrency(inv.total_amount, inv.currency)}</span>
                                </div>
                                <div className="invoice-mobile-row" style={{ marginTop: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>{new Date(inv.created_at).toLocaleDateString()}</span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {canEdit(inv.status) && (
                                            <button onClick={e => { e.stopPropagation(); navigate(`/invoices/${inv.uuid}/edit`, { state: { fromDashboard: true } }); }} className="btn btn-ghost btn-icon btn-sm" title="Edit Invoice">
                                                <IconPencil />
                                            </button>
                                        )}
                                        {canModifySchedule(inv.status) && (
                                            <button onClick={e => { e.stopPropagation(); navigate(`/invoices/${inv.uuid}/preview`, { state: { openSchedule: true, fromDashboard: true } }); }} className="btn btn-ghost btn-icon btn-sm" title="Modify Dispatch Schedule">
                                                <IconCalendar />
                                            </button>
                                        )}
                                        <button onClick={e => { e.stopPropagation(); navigate(`/invoices/${inv.uuid}/preview`, { state: { fromDashboard: true } }); }} className="btn btn-ghost btn-icon btn-sm" title="View PDF Preview">
                                            <IconFile />
                                        </button>
                                        {canMarkPaid(inv.status) && (
                                            <button onClick={e => { e.stopPropagation(); handleMarkPaid(inv.uuid); }} className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-success)' }} title="Mark as Paid">
                                                <IconCheckmark />
                                            </button>
                                        )}
                                        {canResend(inv.status) && (
                                            <button onClick={e => { e.stopPropagation(); setQuickSendInvoice(inv); setQuickSendEmail(inv.client_id ? (clients.get(inv.client_id)?.email || '') : ''); }} className="btn btn-ghost btn-icon btn-sm" title="Resend Email">
                                                <IconResend />
                                            </button>
                                        )}
                                        {inv.status === 'DRAFT' && (
                                            <button onClick={e => { e.stopPropagation(); setQuickSendInvoice(inv); setQuickSendEmail(inv.client_id ? (clients.get(inv.client_id)?.email || '') : ''); }} className="btn btn-ghost btn-icon btn-sm" title="Send Invoice">
                                                <IconSend />
                                            </button>
                                        )}
                                        <button onClick={e => { e.stopPropagation(); handleDuplicate(inv.uuid); }} className="btn btn-ghost btn-icon btn-sm" title="Clone Invoice">
                                            <IconCopy />
                                        </button>
                                        {canCancelSchedule(inv.status) && (
                                            <button onClick={e => { e.stopPropagation(); handleCancelSchedule(inv.uuid, true); }} className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-error)' }} title="Cancel Scheduled Send (reverts to Draft)">
                                                <IconXCircle />
                                            </button>
                                        )}
                                        {canDelete(inv.status) && (
                                            <button onClick={e => { e.stopPropagation(); handleDelete(inv.uuid); }} className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-error)' }} title="Delete Draft Permanently">
                                                <IconTrash />
                                            </button>
                                        )}
                                        {canCancelInvoice(inv.status) && (
                                            <button onClick={e => { e.stopPropagation(); handleMarkCancelled(inv.uuid); }} className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-error)' }} title="Void Invoice">
                                                <IconXCircle />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Desktop Table View */
                    <table className="table" style={{ margin: 0, width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr style={{ background: 'var(--color-bg-elevated)' }}>
                                <th onClick={() => toggleSort('invoice_no')} style={{ cursor: 'pointer', padding: '16px 24px', width: '200px', background: 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        Invoice No. <SortIcon order={filters.sortKey === 'invoice_no' ? filters.sortOrder : null} />
                                    </div>
                                </th>
                                <th onClick={() => toggleSort('client_name')} style={{ cursor: 'pointer', padding: '16px', background: 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        Client <SortIcon order={filters.sortKey === 'client_name' ? filters.sortOrder : null} />
                                    </div>
                                </th>
                                <th onClick={() => toggleSort('created_at')} style={{ cursor: 'pointer', padding: '16px', width: '140px', background: 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        Date <SortIcon order={filters.sortKey === 'created_at' ? filters.sortOrder : null} />
                                    </div>
                                </th>
                                <th style={{ padding: '16px', width: '220px', textAlign: 'left', background: 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border)' }}>Status</th>
                                <th onClick={() => toggleSort('total_amount')} style={{ cursor: 'pointer', padding: '16px', width: '150px', textAlign: 'left', background: 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px' }}>
                                        Amount <SortIcon order={filters.sortKey === 'total_amount' ? filters.sortOrder : null} />
                                    </div>
                                </th>
                                <th style={{ padding: '16px 24px', width: '180px', textAlign: 'right', background: 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border)' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody style={{ zIndex: 1 }}>
                            {paginatedInvoices.map((inv) => (
                                <tr key={inv.uuid} onClick={() => navigate(`/invoices/${inv.uuid}`)} className="table-row-hover" style={{ cursor: 'pointer', borderBottom: '1px solid var(--color-border)', height: '64px' }}>
                                    <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{inv.invoice_no}</td>
                                    <td style={{ padding: '16px' }}>{inv.client_id ? (clients.get(inv.client_id)?.name || 'Unknown') : 'No client'}</td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>{new Date(inv.created_at).toLocaleDateString()}</span>
                                            {inv.updated_at !== inv.created_at && <span style={{ color: 'var(--color-text-muted)', fontSize: '10px', opacity: 0.7 }}>Updated: {new Date(inv.updated_at).toLocaleDateString()}</span>}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'left' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'flex-start', flexWrap: 'wrap', gap: '8px', minWidth: '180px' }}>
                                            <span className={`badge badge-${inv.status.toLowerCase()}`} style={{ display: 'inline-block', textAlign: 'center', minWidth: '80px' }}>{inv.status}</span>
                                            {inv.has_conflict === 1 && <span className="badge" style={{ background: 'var(--color-error)', color: '#fff' }}>⚠️ Requires Review</span>}
                                            {inv.status === 'SCHEDULED' && inv.scheduled_at && (
                                                <div style={{ width: '100%', fontSize: '10px', color: 'var(--color-accent)', fontWeight: 600 }}>{new Date(inv.scheduled_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'left', fontWeight: 600 }}>{formatCurrency(inv.total_amount, inv.currency)}</td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                            {/* Primary Actions */}
                                            {canEdit(inv.status) && (
                                                <button onClick={e => { e.stopPropagation(); navigate(`/invoices/${inv.uuid}/edit`, { state: { fromDashboard: true } }); }} className="btn btn-ghost btn-icon btn-sm" title="Edit Invoice Items"><IconPencil /></button>
                                            )}
                                            {canModifySchedule(inv.status) && (
                                                <button onClick={e => { e.stopPropagation(); navigate(`/invoices/${inv.uuid}/preview`, { state: { openSchedule: true, fromDashboard: true } }); }} className="btn btn-ghost btn-icon btn-sm" title="Modify Dispatch Schedule"><IconCalendar /></button>
                                            )}
                                            <button onClick={e => { e.stopPropagation(); navigate(`/invoices/${inv.uuid}/preview`, { state: { fromDashboard: true } }); }} className="btn btn-ghost btn-icon btn-sm" title="View PDF Preview"><IconFile /></button>
                                            
                                            {/* Status Transitions */}
                                            {canMarkPaid(inv.status) && (
                                                <button onClick={e => { e.stopPropagation(); handleMarkPaid(inv.uuid); }} className="btn btn-ghost btn-icon btn-sm" title="Mark as Paid" style={{ color: 'var(--color-success)' }}><IconCheckmark /></button>
                                            )}
                                            {canResend(inv.status) && (
                                                <button onClick={e => { e.stopPropagation(); setQuickSendInvoice(inv); setQuickSendEmail(inv.client_id ? (clients.get(inv.client_id)?.email || '') : ''); }} className="btn btn-ghost btn-icon btn-sm" title="Resend Email"><IconResend /></button>
                                            )}
                                            {inv.status === 'DRAFT' && (
                                                <button onClick={e => { e.stopPropagation(); setQuickSendInvoice(inv); setQuickSendEmail(inv.client_id ? (clients.get(inv.client_id)?.email || '') : ''); }} className="btn btn-ghost btn-icon btn-sm" title="Send Now"><IconSend /></button>
                                            )}

                                            {/* Secondary Actions */}
                                            <button onClick={e => { e.stopPropagation(); handleDuplicate(inv.uuid); }} className="btn btn-ghost btn-icon btn-sm" title="Clone Invoice"><IconCopy /></button>
                                            
                                            {/* Risky Actions */}
                                            {canCancelSchedule(inv.status) && (
                                                <button onClick={e => { e.stopPropagation(); handleCancelSchedule(inv.uuid, true); }} className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-error)' }} title="Cancel Scheduled Send (reverts to Draft)"><IconXCircle /></button>
                                            )}
                                            {canDelete(inv.status) && (
                                                <button onClick={e => { e.stopPropagation(); handleDelete(inv.uuid); }} className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-error)' }} title="Delete Draft Permanently"><IconTrash /></button>
                                            )}
                                            {canCancelInvoice(inv.status) && (
                                                <button onClick={e => { e.stopPropagation(); handleMarkCancelled(inv.uuid); }} className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-error)' }} title="Void Invoice"><IconXCircle /></button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination Footer */}
            <div style={{ flexShrink: 0, padding: isMobile ? '12px 0' : '20px 0', borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span className="card-meta">Showing {paginatedInvoices.length} of {processedInvoices.length}</span>
                        {!isMobile && totalPages > 1 && (
                            <form onSubmit={handleJumpPage} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                                <span className="card-meta" style={{ whiteSpace: 'nowrap' }}>Go to:</span>
                                <BaseInput 
                                    type="number" 
                                    style={{ width: '60px', height: '32px', margin: 0, padding: '4px 8px', fontSize: '12px' }} 
                                    value={jumpPage}
                                    onChange={v => setJumpPage(v)}
                                    placeholder="Pg"
                                    noMargin
                                />
                            </form>
                        )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)} className="btn btn-ghost btn-sm">«</button>
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="btn btn-ghost btn-sm">‹</button>
                        
                        {!isMobile && pageNumbers.map(n => (
                            <button 
                                key={n} 
                                onClick={() => setCurrentPage(n)} 
                                className={`btn btn-sm ${n === currentPage ? 'btn-primary' : 'btn-ghost'}`}
                                style={{ minWidth: '36px', height: '36px', padding: 0 }}
                            >
                                {n}
                            </button>
                        ))}
                        
                        {isMobile && <div style={{ padding: '0 8px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '13px' }}>{currentPage} / {totalPages || 1}</div>}

                        <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)} className="btn btn-ghost btn-sm">›</button>
                        <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(totalPages)} className="btn btn-ghost btn-sm">»</button>
                    </div>
                </div>
            </div>

            {quickSendInvoice && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                    <div className="card" style={{ width: isMobile ? '90%' : '400px', padding: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', background: 'var(--color-bg-secondary)' }}>
                        <h3>{quickSendInvoice.status === 'SENT' ? 'Resend Invoice' : 'Send Invoice'}</h3>
                        <form onSubmit={handleQuickSend} style={{ marginTop: '16px' }}>
                             <div className="form-group" style={{ marginBottom: '24px' }}>
                                <BaseInput type="email" label="Recipient Email" value={quickSendEmail} onChange={v => setQuickSendEmail(v)} required />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setQuickSendInvoice(null)} className="btn btn-ghost">Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={isSending}>{isSending ? 'Sending...' : 'Confirm'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <style>{`.loader.mini { border: 2px solid rgba(124,93,250,0.2); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}
