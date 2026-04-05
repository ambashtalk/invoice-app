import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import InvoicePreview from '../components/InvoicePreview'
import { DateTimePicker } from '../components/DateTimePicker'

const IconCalendar = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
)

const IconSend = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
)

const IconResend = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
)

const IconTrash = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
)

interface Invoice {
    uuid: string
    invoice_no: string
    client_id: string | null
    currency: 'INR' | 'USD' | 'EUR'
    tax_rate: number
    total_amount: number
    items: any[]
    created_at: number
    scheduled_at: number | null
    status: string
    email_body: string | null
}

export default function InvoicePDF() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { state } = useLocation()
    const { success, error, warning, info } = useToast()

    const fromMode = state?.fromMode // 'edit' or 'view'
    const fromDashboard = state?.fromDashboard

    const [invoice, setInvoice] = useState<Invoice | null>(null)
    const [client, setClient] = useState<any>(null)
    const [paymentProfile, setPaymentProfile] = useState<any>(null)
    const [signature, setSignature] = useState<any>(null)
    const [sellerInfo, setSellerInfo] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)

    const [scheduleForm, setScheduleForm] = useState({
        email: '',
        scheduledAt: '',
        subject: '',
        body: ''
    })
    const [showSchedulePanel, setShowSchedulePanel] = useState(false)
    const [pendingDispatch, setPendingDispatch] = useState<any>(null)
    const [hasInitializedForm, setHasInitializedForm] = useState(false)
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Polling effect for outbox
    useEffect(() => {
        let timer: ReturnType<typeof setInterval>
        if (invoice?.status === 'SCHEDULED' || invoice?.status === 'DRAFT') {
            timer = setInterval(() => {
                if (id) loadAll(id, false)
            }, 5000)
        }
        return () => {
            if (timer) clearInterval(timer)
        }
    }, [invoice?.status, id])

    useEffect(() => {
        if (id) {
            loadAll(id, true)
            setHasInitializedForm(false) // Reset on new invoice
            
            // Handle request to open schedule from Dashboard
            if (state?.openSchedule) {
                setShowSchedulePanel(true)
            }
        }
    }, [id, state?.openSchedule])

    // One-time initialization of schedule form
    useEffect(() => {
        if (invoice && client && !hasInitializedForm) {
            let email = client.email || ''
            let scheduledAt = ''
            let subject = `Invoice ${invoice.invoice_no}`
            let body = invoice.email_body || `Please find attached Invoice ${invoice.invoice_no}. Thank you for your business.`

            if (pendingDispatch) {
                email = pendingDispatch.recipient_email || email
                subject = pendingDispatch.subject || subject
                body = pendingDispatch.body || body
                if (pendingDispatch.scheduled_at) {
                    scheduledAt = new Date(pendingDispatch.scheduled_at).toISOString().slice(0, 16)
                }
            }

            if (!scheduledAt) {
                const today = new Date()
                const tomorrow = new Date(today)
                tomorrow.setDate(today.getDate() + 1)
                tomorrow.setHours(tomorrow.getHours(), 0, 0, 0)
                scheduledAt = tomorrow.toISOString().slice(0, 16)
            }

            setScheduleForm({
                email,
                scheduledAt,
                subject,
                body
            })
            setHasInitializedForm(true)
        }
    }, [invoice, client, hasInitializedForm, pendingDispatch])

    async function loadAll(invoiceId: string, showLoading = false) {
        if (showLoading) setLoading(true)
        try {
            const [inv, outbox, profiles, sigs, seller] = await Promise.all([
                window.electronAPI.getInvoice(invoiceId),
                window.electronAPI.getOutboxItems(),
                window.electronAPI.getPaymentProfiles(),
                window.electronAPI.getSignatures(),
                window.electronAPI.getSellerInfo()
            ])

            if (!inv) {
                navigate('/')
                return
            }

            const parsed = { ...inv, items: typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items }
            setInvoice(parsed)
            setSellerInfo(seller)

            // Find current pending dispatch if any
            const pending = outbox.find((o: any) => o.invoice_id === invoiceId && o.status === 'PENDING')
            setPendingDispatch(pending || null)

            const defaultProfile = profiles.find((p: any) => p.is_default) || profiles[0] || null
            setPaymentProfile(defaultProfile)

            setSignature(sigs[0] || null)

            if (inv.client_id) {
                const clientData = await window.electronAPI.getClient(inv.client_id)
                setClient(clientData)
            }
        } catch (error) {
            console.error('Failed to load invoice:', error)
        } finally {
            if (showLoading) setLoading(false)
        }
    }

    async function handleExportPDF() {
        if (!id) return
        setExporting(true)
        try {
            const result = await window.electronAPI.generatePDF(id)
            if (result.saved) {
                success(`PDF saved to: ${result.path}`)
            }
        } catch (err) {
            console.error('PDF export failed:', err)
            error('PDF export failed.')
        } finally {
            setExporting(false)
        }
    }

    async function handleScheduleSend(e: React.FormEvent, sendNow: boolean = false) {
        e.preventDefault()
        if (!id || !scheduleForm.email) return

        const delay = sendNow ? 10000 : 0
        const scheduledAt = sendNow 
            ? Date.now() + delay
            : (scheduleForm.scheduledAt ? new Date(scheduleForm.scheduledAt).getTime() : Date.now() + 60000)

        try {
            await window.electronAPI.scheduleInvoice(
                id,
                scheduleForm.email,
                scheduledAt,
                scheduleForm.subject,
                scheduleForm.body
            )
            
            if (sendNow) {
                warning(`Sending invoice in 10s...`, {
                    label: 'Undo',
                    onClick: () => handleCancelSchedule(false)
                }, 10000)
            } else {
                success(`Invoice scheduled for ${new Date(scheduledAt).toLocaleString()}`)
            }
            
            setShowSchedulePanel(false)
            loadAll(id, false)
        } catch (err) {
            console.error('Scheduling failed:', err)
            error('Failed to schedule invoice.')
        }
    }

    async function handleCancelSchedule(confirmNeeded: boolean = true) {
        if (!id) return
        if (confirmNeeded && !confirm('Cancel the scheduled email?')) return
        try {
            await window.electronAPI.cancelScheduledInvoice(id)
            if (!confirmNeeded) info('Send cancelled.')
            else success('Schedule cancelled.')
            loadAll(id, false)
        } catch (err) {
            console.error('Failed to cancel:', err)
            error('Failed to cancel schedule.')
        }
    }

    function handleBack() {
        if (fromDashboard) {
            navigate('/')
            return
        }
        if (fromMode === 'edit') {
            navigate(`/invoices/${id}/edit`)
        } else {
            navigate(`/invoices/${id}`)
        }
    }

    if (loading || !invoice) {
        return <div className="empty-state"><p className="empty-state-description">Loading preview...</p></div>
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            <div style={{ flexShrink: 0, paddingBottom: '16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', zIndex: 10, marginTop: '-24px', paddingTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <h1 className="page-title" style={{ margin: 0 }}>Invoice Preview</h1>
                            <span className={`badge badge-${invoice.status.toLowerCase()}`} style={{ verticalAlign: 'middle' }}>{invoice.status}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            {invoice?.invoice_no && <span className="card-meta" style={{ fontWeight: 600, color: 'var(--color-accent)' }}>{invoice.invoice_no}</span>}
                            {!isMobile && invoice?.invoice_no && <span style={{ color: 'var(--color-border)' }}>|</span>}
                            {!isMobile && <span className="page-subtitle" style={{ margin: 0 }}>Review the document preview before dispatch</span>}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button type="button" onClick={handleBack} className="btn btn-ghost" style={{ padding: '0 12px' }} title="Return to Previous Page">←</button>
                        
                        {(invoice.status === 'DRAFT') && (
                            <button onClick={() => navigate(`/invoices/${id}/edit`)} className="btn btn-secondary" title="Edit line items and details">
                                Edit
                            </button>
                        )}
                        
                        <button onClick={handleExportPDF} className="btn btn-secondary" disabled={exporting}>
                            {exporting ? 'Exporting...' : 'Export PDF'}
                        </button>

                        {invoice.status === 'DRAFT' && (
                            <>
                                <button onClick={() => setShowSchedulePanel(p => !p)} className="btn btn-secondary" title="Set dispatch date and time">
                                    <IconCalendar /> Schedule
                                </button>
                                <button onClick={() => setShowSchedulePanel(true)} className="btn btn-primary" title="Send email now via Gmail">
                                    <IconSend /> Send Now
                                </button>
                            </>
                        )}

                        {invoice.status === 'SCHEDULED' && (
                            <>
                                <button onClick={() => setShowSchedulePanel(p => !p)} className="btn btn-primary" title="Update dispatch date and time">
                                    <IconCalendar /> Modify Schedule
                                </button>
                                <button onClick={() => handleCancelSchedule(true)} className="btn btn-ghost" style={{ color: 'var(--color-error)' }} title="Remove from outbox and revert to Draft">
                                    <IconTrash /> Cancel Schedule
                                </button>
                            </>
                        )}

                        {invoice.status === 'SENT' && (
                            <button onClick={() => setShowSchedulePanel(p => !p)} className="btn btn-primary" title="Send again to the same recipient">
                                <IconResend /> Resend
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', background: 'var(--color-bg-dark)', padding: 'var(--spacing-xl)' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                    {showSchedulePanel && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '24px', marginBottom: '24px', backdropFilter: 'blur(10px)', position: 'relative', zIndex: 100 }}>
                            <h3 style={{ marginBottom: '16px' }}>Schedule Email Dispatch</h3>
                            <form onSubmit={(e) => handleScheduleSend(e)}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                        <label className="form-label">Recipient Email</label>
                                        <input type="email" className="form-input" value={scheduleForm.email} onChange={e => setScheduleForm(f => ({ ...f, email: e.target.value }))} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Subject</label>
                                        <input type="text" className="form-input" value={scheduleForm.subject} onChange={e => setScheduleForm(f => ({ ...f, subject: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Send At Date/Time</label>
                                        <DateTimePicker 
                                            value={scheduleForm.scheduledAt} 
                                            onChange={(val: string) => setScheduleForm(f => ({ ...f, scheduledAt: val }))}
                                            noMargin
                                        />
                                    </div>
                                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                        <label className="form-label">Email Body</label>
                                        <textarea className="form-input" value={scheduleForm.body} onChange={e => setScheduleForm(f => ({ ...f, body: e.target.value }))} rows={4} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                                    <button type="button" onClick={() => setShowSchedulePanel(false)} className="btn btn-ghost">Cancel</button>
                                    <button type="button" onClick={(e) => handleScheduleSend(e, false)} className="btn btn-secondary">Schedule</button>
                                    <button type="submit" onClick={(e) => handleScheduleSend(e, true)} className="btn btn-primary">Send Now</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.15)', background: 'white', borderRadius: '4px', overflow: 'hidden' }}>
                            <InvoicePreview
                                invoice={{ ...invoice, client_id: invoice.client_id ?? undefined, scheduled_at: invoice.scheduled_at ?? undefined }}
                                client={client}
                                paymentProfile={paymentProfile}
                                signature={signature}
                                sellerInfo={sellerInfo}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
