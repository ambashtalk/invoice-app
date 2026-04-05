import { useState, useEffect, FC } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { BaseInput } from '../components/BaseInput'
import { BaseDropdown } from '../components/BaseDropdown'
import { numberToWords } from '../../shared/utils/numbers-to-words'
import { calculateTax } from '../../shared/utils/tax-calculator'

interface LineItem {
    slNo: number
    description: string
    amount: number
}

interface Client {
    uuid: string
    name: string
    email: string | null
}

interface Signature {
    id: string
    name: string
    is_default: number
}

interface OutboxItem {
    id: string
    invoice_id: string
    recipient_email: string
    scheduled_at: number
    sent_at: number | null
    status: 'PENDING' | 'SENT' | 'FAILED'
    error_message: string | null
}

interface FormData {
    client_id: string
    signature_id: string
    currency: 'INR' | 'USD' | 'EUR'
    tax_rate: number
    items: LineItem[]
    email_body: string
}

const TAX_RATES = [
    { value: 0.05, label: '5% GST' },
    { value: 0.12, label: '12% GST' },
    { value: 0.18, label: '18% GST' },
    { value: 0.28, label: '28% GST' }
]

const IconCheck: FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
    </svg>
)

const IconClock: FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
)

const IconAlert: FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
)

const IconSend: FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
)

const IconResend: FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
)

const IconCopy: FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
)

const IconTrash: FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
)

const IconPencil: FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
    </svg>
)

const IconDots: FC = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
    </svg>
)

const IconCheckCircle: FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
)

const IconXCircle: FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
)

const IconCalendar: FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
)

// Walkthrough:
// 1. Implemented deep cloning for initialData to prevent reference mutation.
// 2. Fixed immutable line item updates to ensure React state triggers re-renders correctly.
// 3. Synchronized PDF labels and added Due Date support in the backend.
// 4. Enhanced "Total in Words" logic for better currency representation.
// 5. Verified 'isDirty' state logic across navigation and save actions.

export default function InvoiceEditor() {
    const { id } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const { success, error, warning, info } = useToast()
    const isEditing = Boolean(id)
    const isEditModeUrl = location.pathname.endsWith('/edit') || location.pathname.endsWith('/new')

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
    const [isReadOnly, setIsReadOnly] = useState(!isEditModeUrl)
    const [clients, setClients] = useState<Client[]>([])
    const [signatures, setSignatures] = useState<Signature[]>([])
    const [history, setHistory] = useState<OutboxItem[]>([])
    const [invoiceCreatedAt, setInvoiceCreatedAt] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [invoiceNo, setInvoiceNo] = useState<string | null>(null)
    const [invoiceStatus, setInvoiceStatus] = useState<'DRAFT' | 'SCHEDULED' | 'SENT' | 'PAID' | 'CANCELLED'>('DRAFT')
    const [invoiceScheduledAt, setInvoiceScheduledAt] = useState<number | null>(null)
    const [quickSendInvoice, setQuickSendInvoice] = useState<any>(null)
    const [quickSendEmail, setQuickSendEmail] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [initialData, setInitialData] = useState<FormData | null>(null)
    const [showActions, setShowActions] = useState(false)

    const [formData, setFormData] = useState<FormData>({
        client_id: '',
        signature_id: '',
        currency: 'INR',
        tax_rate: 0.18,
        items: [{ slNo: 1, description: '', amount: 0 }],
        email_body: ''
    })

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768)
        window.addEventListener('resize', handleResize)
        loadData()
        return () => window.removeEventListener('resize', handleResize)
    }, [id, location.pathname])

    async function loadData(showLoader = true) {
        if (showLoader) setLoading(true)
        try {
            const [clientsList, signaturesList, outboxList] = await Promise.all([
                window.electronAPI.getClients(),
                window.electronAPI.getSignatures(),
                window.electronAPI.getOutboxItems()
            ])
            setClients(clientsList)
            setSignatures(signaturesList)

            if (id) {
                const invoice = await window.electronAPI.getInvoice(id)
                if (invoice) {
                    setInvoiceCreatedAt(invoice.created_at)
                    setInvoiceNo(invoice.invoice_no)
                    setInvoiceStatus(invoice.status || 'DRAFT')
                    setInvoiceScheduledAt(invoice.scheduled_at || null)
                    setHistory(outboxList.filter((m: any) => m.invoice_id === id).sort((a: any, b: any) => b.scheduled_at - a.scheduled_at))
                    
                    const dbData = {
                        client_id: invoice.client_id || '',
                        signature_id: invoice.signature_id || '',
                        currency: invoice.currency,
                        tax_rate: invoice.tax_rate,
                        items: invoice.items,
                        email_body: invoice.email_body || ''
                    }
                    setFormData(dbData)
                    // Deep clone to ensure no reference sharing that would break isDirty check
                    setInitialData(JSON.parse(JSON.stringify(dbData)))
                    
                    // Integrity Rule: Non-drafts are always read-only
                    if (invoice.status !== 'DRAFT') {
                        setIsReadOnly(true)
                    } else {
                        setIsReadOnly(!isEditModeUrl)
                    }
                }
            } else if (signaturesList.length > 0) {
                const defaultSig = signaturesList.find((s: any) => s.is_default) || signaturesList[0]
                setFormData(prev => ({ ...prev, signature_id: defaultSig.id }))
                setIsReadOnly(false)
            }
        } catch (err) { error('Failed to load data') } finally { setLoading(false) }
    }

    async function handleQuickSend(e: React.FormEvent) {
        e.preventDefault()
        if (!id || !quickSendEmail) return
        setIsSending(true)
        try {
            const delay = 10000
            const scheduledAt = Date.now() + delay
            await window.electronAPI.scheduleInvoice(id, quickSendEmail, scheduledAt, `Invoice ${invoiceNo}`, `Please find attached Invoice ${invoiceNo}. Thank you!`)
            
            warning(`Sending invoice in 10s...`, {
                label: 'Undo',
                onClick: () => handleCancelSchedule(false)
            }, delay)

            setQuickSendInvoice(null)
            loadData(false)
        } catch (err) { error('Quick send failed') } finally { setIsSending(false) }
    }

    async function handleCancelSchedule(confirmNeeded: boolean = true) {
        if (!id) return
        if (confirmNeeded && !confirm('Cancel the scheduled email?')) return
        try {
            await window.electronAPI.cancelScheduledInvoice(id)
            if (!confirmNeeded) info('Send cancelled.')
            else success('Schedule cancelled.')
            loadData(false)
        } catch (err) { error('Failed to cancel') }
    }

    async function handleDuplicate() {
        if (!id) return
        setSaving(true)
        try {
            const data = {
                client_id: formData.client_id || undefined,
                signature_id: formData.signature_id || undefined,
                currency: formData.currency,
                tax_rate: formData.tax_rate,
                total_amount: totalAmount,
                items: formData.items,
                email_body: formData.email_body || undefined
            }
            const newInv = await window.electronAPI.createInvoice(data)
            success('Invoice duplicated.')
            navigate(`/invoices/${newInv.uuid}`)
        } catch (err) { error('Duplication failed.') } finally { setSaving(false); setShowActions(false); }
    }

    const totalAmount = formData.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
    const taxBreakdown = calculateTax(totalAmount, formData.tax_rate)

    function formatCurrency(amount: number): string {
        return new Intl.NumberFormat(formData.currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency: formData.currency }).format(amount)
    }

    const isDirty = initialData && JSON.stringify(formData) !== JSON.stringify(initialData)

    async function handlePreview() {
        if (!id) {
            // New invoice, must save first
            try {
                setSaving(true)
                const data = { ...formData, total_amount: totalAmount }
                const newInv = await window.electronAPI.createInvoice(data)
                success('Invoice created and saved.')
                navigate(`/invoices/${newInv.uuid}/preview`)
            } catch (err) { error('Failed to save before preview') } finally { setSaving(false) }
            return
        }

        if (isDirty) {
            try {
                setSaving(true)
                const data = { ...formData, total_amount: totalAmount }
                await window.electronAPI.updateInvoice(id, data)
                success('Invoice updated.')
                setInitialData(data)
                navigate(`/invoices/${id}/preview`)
            } catch (err) { error('Failed to save changes') } finally { setSaving(false) }
        } else {
            navigate(`/invoices/${id}/preview`)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        try {
            const data = { ...formData, total_amount: totalAmount }
            if (isEditing) {
                await window.electronAPI.updateInvoice(id!, data)
                success('Invoice updated.')
                setInitialData(data)
                navigate(`/invoices/${id}`) // Go to View mode after save
            } else {
                const newInv = await window.electronAPI.createInvoice(data)
                success('Invoice created.')
                navigate(`/invoices/${newInv.uuid}`)
            }
        } catch (err) { error('Save failed') } finally { setSaving(false) }
    }

    async function handleMarkPaid() {
        if (!confirm('Mark this invoice as Paid?')) return
        try {
            await window.electronAPI.markInvoicePaid(id!)
            setInvoiceStatus('PAID')
            success('Invoice marked as Paid.')
        } catch (err: any) { error(err.message) }
    }

    async function handleMarkCancelled() {
        if (!confirm('Are you sure you want to cancel this invoice? This action cannot be undone.')) return
        try {
            await window.electronAPI.markInvoiceCancelled(id!)
            setInvoiceStatus('CANCELLED')
            success('Invoice cancelled.')
        } catch (err: any) { error(err.message) }
    }

    async function handleDelete() {
        if (!confirm('Permanent delete this draft?')) return
        try {
            await window.electronAPI.deleteInvoice(id!)
            success('Invoice deleted.')
            navigate('/')
        } catch (err: any) { error(err.message) }
    }

    if (loading) return <div className="empty-state"><p>Loading...</p></div>

    return (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Stick Header */}
            <div style={{ flexShrink: 0, paddingBottom: '16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', zIndex: 10, marginTop: '-24px', paddingTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <h1 className="page-title" style={{ margin: 0 }}>{isEditing ? (isReadOnly ? 'Invoice Details' : 'Edit Invoice') : 'Create Invoice'}</h1>
                            {isEditing && <span className={`badge badge-${invoiceStatus.toLowerCase()}`} style={{ verticalAlign: 'middle' }}>{invoiceStatus}</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            {invoiceNo && <span className="card-meta" style={{ fontWeight: 600, color: 'var(--color-accent)' }}>{invoiceNo}</span>}
                            {!isMobile && invoiceNo && <span style={{ color: 'var(--color-border)' }}>|</span>}
                            {!isMobile && <span className="page-subtitle" style={{ margin: 0 }}>{isReadOnly ? 'Review the document details' : 'Update the line items and recipient'}</span>}
                            {invoiceStatus === 'SCHEDULED' && invoiceScheduledAt && (
                                <>
                                    {!isMobile && <span style={{ color: 'var(--color-border)' }}>|</span>}
                                    <span className="page-subtitle" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                                        Scheduled for {new Date(invoiceScheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto', alignItems: 'center' }}>
                        <button type="button" onClick={() => navigate('/')} className="btn btn-ghost" style={{ padding: '0 12px' }} title="Return to Dashboard">←</button>
                        
                        <button 
                            type="button" 
                            onClick={handlePreview} 
                            className="btn btn-secondary" 
                            style={{ flex: isMobile ? 1 : 'none' }}
                            title={isDirty ? "Save modifications and then preview PDF" : "View generated PDF preview"}
                        >
                            {isDirty || !id ? 'Save & Preview PDF' : 'PDF Preview'}
                        </button>

                        {invoiceStatus === 'SCHEDULED' && (
                            <button type="button" onClick={() => navigate(`/invoices/${id}/preview`, { state: { openSchedule: true, fromDashboard: true } })} className="btn btn-primary" title="Update dispatch date and time">
                                <IconCalendar /> Modify Schedule
                            </button>
                        )}

                        {!isReadOnly ? (
                            <>
                                <button type="button" onClick={() => isEditing ? navigate(`/invoices/${id}`) : navigate('/')} className="btn btn-ghost">Cancel</button>
                                <button type="button" onClick={handleSubmit} className="btn btn-primary" disabled={saving} style={{ minWidth: '100px' }} title="Save modifications to disk">{saving ? 'Saving...' : 'Save Invoice'}</button>
                            </>
                        ) : (
                            <>
                                {invoiceStatus === 'DRAFT' && !isReadOnly && (
                                    <button type="button" onClick={() => { setQuickSendInvoice(true); setQuickSendEmail(clients.find(c => c.uuid === formData.client_id)?.email || ''); }} className="btn btn-primary" style={{ flex: isMobile ? 1 : 'none' }} title="Send via Gmail now">
                                        <IconSend /> Send Now
                                    </button>
                                )}
                                {invoiceStatus === 'SENT' && (
                                    <button type="button" onClick={() => { setQuickSendInvoice(true); setQuickSendEmail(clients.find(c => c.uuid === formData.client_id)?.email || ''); }} className="btn btn-primary" style={{ flex: isMobile ? 1 : 'none' }} title="Resend the existing email">
                                        <IconResend /> Resend
                                    </button>
                                )}
                                {invoiceStatus === 'SCHEDULED' && (
                                    <button type="button" onClick={() => handleCancelSchedule(true)} className="btn btn-ghost" style={{ color: 'var(--color-error)' }} title="Cancel the scheduled dispatch">
                                        Cancel Schedule
                                    </button>
                                )}
                                {invoiceStatus === 'DRAFT' && (
                                    <button type="button" onClick={() => navigate(`/invoices/${id}/edit`)} className="btn btn-secondary" style={{ padding: '0 12px' }} title="Edit"><IconPencil /></button>
                                )}
                                
                                <div style={{ position: 'relative' }}>
                                    <button type="button" onClick={() => setShowActions(!showActions)} className="btn btn-secondary" style={{ padding: '0 8px' }}><IconDots /></button>
                                    {showActions && (
                                        <div className="custom-dropdown-panel slide-up" style={{ right: 0, top: 'calc(100% + 8px)', width: '200px', padding: '4px' }}>
                                            <button onClick={handleDuplicate} className="custom-dropdown-item" style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}>
                                                <IconCopy /> Duplicate
                                            </button>
                                            {invoiceStatus === 'SENT' && (
                                                <>
                                                    <button onClick={handleMarkPaid} className="custom-dropdown-item" style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', color: 'var(--color-success)' }}>
                                                        <IconCheckCircle /> Mark Paid
                                                    </button>
                                                    <button onClick={handleMarkCancelled} className="custom-dropdown-item" style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', color: 'var(--color-error)' }}>
                                                        <IconXCircle /> Cancel Invoice
                                                    </button>
                                                </>
                                            )}
                                            {invoiceStatus === 'DRAFT' && (
                                                <button onClick={handleDelete} className="custom-dropdown-item" style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', color: 'var(--color-error)' }}>
                                                    <IconTrash /> Delete Draft
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflowY: 'auto', paddingTop: '24px', paddingRight: '4px' }}>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                        <BaseDropdown 
                            label="Client" 
                            placeholder="Select Client"
                            options={clients.map(c => ({ label: c.name, value: c.uuid }))} 
                            selected={formData.client_id} 
                            onChange={v => setFormData({ ...formData, client_id: v })} 
                            disabled={isReadOnly} 
                        />
                        <BaseDropdown 
                            label="Signature" 
                            placeholder="Default"
                            options={signatures.map(s => ({ label: s.name, value: s.id }))} 
                            selected={formData.signature_id} 
                            onChange={v => setFormData({ ...formData, signature_id: v })} 
                            disabled={isReadOnly} 
                        />
                        <BaseDropdown 
                            label="Currency" 
                            options={[{ label: 'INR', value: 'INR' }, { label: 'USD', value: 'USD' }, { label: 'EUR', value: 'EUR' }]} 
                            selected={formData.currency} 
                            onChange={v => setFormData({ ...formData, currency: v })} 
                            disabled={isReadOnly} 
                        />
                        <BaseDropdown 
                            label="Tax Rate" 
                            options={TAX_RATES.map(r => ({ label: r.label, value: r.value.toString() }))} 
                            selected={formData.tax_rate.toString()} 
                            onChange={v => setFormData({ ...formData, tax_rate: parseFloat(v) })} 
                            disabled={isReadOnly} 
                        />
                    </div>

                    <div className="card" style={{ marginBottom: '32px' }}>
                        <h3>Line Items</h3>
                        {isMobile ? (
                            /* Mobile Stacked Items */
                            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {formData.items.map((item, i) => (
                                    <div key={i} className="card" style={{ background: 'var(--color-bg-primary)', padding: '12px', position: 'relative' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>#{item.slNo}</span>
                                            {!isReadOnly && formData.items.length > 1 && (
                                                <button type="button" onClick={() => {
                                                    setFormData({ ...formData, items: formData.items.filter((_, idx) => idx !== i).map((it, idx) => ({ ...it, slNo: idx + 1 })) });
                                                }} style={{ background: 'none', border: 'none', color: 'var(--color-error)' }}>✕</button>
                                            )}
                                        </div>
                                        <div style={{ marginBottom: '8px' }}>
                                            <BaseInput placeholder="Description" value={item.description} onChange={v => {
                                                const items = formData.items.map((it, idx) => idx === i ? { ...it, description: v } : it);
                                                setFormData({ ...formData, items });
                                            }} disabled={isReadOnly} noMargin />
                                        </div>
                                        <div style={{ marginBottom: 0 }}>
                                            <BaseInput type="number" placeholder="Amount" value={item.amount || ''} onChange={v => {
                                                const items = formData.items.map((it, idx) => idx === i ? { ...it, amount: parseFloat(v) || 0 } : it);
                                                setFormData({ ...formData, items });
                                            }} disabled={isReadOnly} style={{ textAlign: 'right' }} noMargin />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* Desktop Table Items */
                            <table className="table" style={{ marginTop: '16px' }}>
                                <thead><tr><th style={{ width: '60px' }}>#</th><th style={{ paddingLeft: '0' }}>Description</th><th style={{ width: '150px', textAlign: 'right' }}>Amount</th><th style={{ width: '50px' }}></th></tr></thead>
                                <tbody>{formData.items.map((item, i) => (
                                    <tr key={i}>
                                        <td style={{ verticalAlign: 'middle', color: 'var(--color-text-muted)' }}>{item.slNo}</td>
                                        <td style={{ verticalAlign: 'middle', paddingLeft: '0' }}><BaseInput placeholder="Description" value={item.description} onChange={v => {
                                            const items = formData.items.map((it, idx) => idx === i ? { ...it, description: v } : it);
                                            setFormData({ ...formData, items });
                                        }} disabled={isReadOnly} style={{ margin: 0 }} noMargin /></td>
                                        <td style={{ verticalAlign: 'middle' }}><BaseInput type="number" placeholder="Amount" value={item.amount || ''} onChange={v => {
                                            const items = formData.items.map((it, idx) => idx === i ? { ...it, amount: parseFloat(v) || 0 } : it);
                                            setFormData({ ...formData, items });
                                        }} disabled={isReadOnly} style={{ margin: 0, textAlign: 'right' }} noMargin /></td>
                                        <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{!isReadOnly && formData.items.length > 1 && <button type="button" onClick={() => {
                                            setFormData({ ...formData, items: formData.items.filter((_, idx) => idx !== i).map((it, idx) => ({ ...it, slNo: idx + 1 })) });
                                        }} className="btn btn-ghost" style={{ color: 'var(--color-error)' }}>✕</button>}</td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        )}
                        {!isReadOnly && <button type="button" onClick={() => setFormData({ ...formData, items: [...formData.items, { slNo: formData.items.length + 1, description: '', amount: 0 }] })} className="btn btn-secondary" style={{ marginTop: '16px', width: isMobile ? '100%' : 'auto' }}>+ Add Item</button>}
                    </div>

                    <div className="card" style={{ marginBottom: '48px', padding: isMobile ? '16px' : '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '16px' }}>
                            <div>
                                <h3>Summary</h3>
                                {formData.currency === 'INR' && totalAmount > 0 && <p className="card-meta" style={{ marginTop: '4px', fontSize: '13px' }}>{numberToWords(totalAmount)}</p>}
                            </div>
                            <div style={{ textAlign: isMobile ? 'left' : 'right', width: isMobile ? '100%' : 'auto' }}>
                                <div className="card-meta">Base: {formatCurrency(taxBreakdown.baseAmount)} | Tax: {formatCurrency(taxBreakdown.taxAmount)}</div>
                                <div className="amount amount-large" style={{ marginTop: '8px', color: 'var(--color-accent)' }}>{formatCurrency(totalAmount)}</div>
                            </div>
                        </div>
                    </div>
                </form>

                {isEditing && (
                    <div style={{ marginTop: '48px', paddingBottom: '64px' }}>
                        <h3 style={{ marginBottom: '24px' }}>Activity Log</h3>
                        <div className="card" style={{ position: 'relative', paddingLeft: isMobile ? '40px' : '48px' }}>
                            {history.map((item, idx) => (
                                <div key={item.id} style={{ position: 'relative', marginBottom: '32px' }}>
                                    <div style={{ position: 'absolute', left: '-32px', top: '4px', width: '16px', height: '16px', borderRadius: '50%', background: item.status === 'SENT' ? 'var(--color-success)' : (item.status === 'FAILED' ? 'var(--color-error)' : 'var(--color-warning)'), border: '4px solid var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {item.status === 'SENT' ? <IconCheck /> : (item.status === 'FAILED' ? <IconAlert /> : <IconClock />)}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '8px' }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>
                                                {history.length > 1 && idx === 0 ? 'Latest Attempt' : 
                                                 idx === history.length - 1 && history.length > 1 ? 'Initial Dispatch' : 
                                                 history.length === 1 ? 'Email Sent' :
                                                 `Resend Attempt #${history.length - 1 - idx}`}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>To: {item.recipient_email}</div>
                                        </div>
                                        <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                                            <span className={`badge badge-${item.status.toLowerCase()}`} style={{ fontSize: '10px' }}>{item.status}</span>
                                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{item.sent_at ? new Date(item.sent_at).toLocaleString() : new Date(item.scheduled_at).toLocaleString()}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '-32px', top: '4px', width: '16px', height: '16px', borderRadius: '50%', background: 'var(--color-accent)', border: '4px solid var(--color-bg-secondary)' }}></div>
                                <div style={{ fontWeight: 600 }}>Invoice Created</div>
                                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{invoiceCreatedAt !== null ? new Date(invoiceCreatedAt).toLocaleString() : ''}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {quickSendInvoice && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                    <div className="card" style={{ width: isMobile ? '90%' : '400px', padding: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', background: 'var(--color-bg-secondary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0 }}>{invoiceStatus === 'SENT' ? 'Resend Invoice' : 'Send Invoice'}</h3>
                            <button onClick={() => setQuickSendInvoice(null)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>✕</button>
                        </div>
                        <form onSubmit={handleQuickSend}>
                             <div style={{ marginBottom: '24px' }}>
                                <BaseInput type="email" label="Recipient Email" value={quickSendEmail} onChange={v => setQuickSendEmail(v)} required />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setQuickSendInvoice(null)} className="btn btn-ghost">Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={isSending}>
                                    {isSending ? 'Scheduling...' : (invoiceStatus === 'SENT' ? 'Resend Now' : 'Send Now')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
