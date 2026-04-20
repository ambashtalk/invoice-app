import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useToast } from '../../contexts/ToastContext'
import { FormData, Client, Signature } from './types'
import { calculateInvoiceTax } from '../../../shared/utils/tax-calculator'

export function useInvoiceEditor(isEditing: boolean) {
    const { id } = useParams(); const navigate = useNavigate(); const { success, error } = useToast()
    const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false)
    const [clients, setClients] = useState<Client[]>([]); const [signatures, setSignatures] = useState<Signature[]>([])
    const [invoiceNo, setInvoiceNo] = useState<string | null>(null); const [invoiceStatus, setInvoiceStatus] = useState<string>('DRAFT')
    const [formData, setFormData] = useState<FormData>({ client_id: '', signature_id: '', currency: 'INR', tax_rate: 0.18, items: [{ slNo: 1, description: '', amount: 0, tax_rate: 0.18, show_sgst_cgst: true }], email_body: '' })
    const [initialData, setInitialData] = useState<FormData | null>(null)

    useEffect(() => { loadData() }, [id])
    async function loadData() {
        setLoading(true); try {
            const [cls, sigs] = await Promise.all([window.electronAPI.getClients(), window.electronAPI.getSignatures()]); setClients(cls); setSignatures(sigs)
            if (isEditing && id) {
                const inv = await window.electronAPI.getInvoice(id)
                if (inv) { setFormData(inv); setInitialData(JSON.parse(JSON.stringify(inv))); setInvoiceNo(inv.invoice_no); setInvoiceStatus(inv.status) }
            } else {
                const defSig = sigs.find((s: any) => s.is_default) || sigs[0]
                if (defSig) setFormData(prev => ({ ...prev, signature_id: defSig.id }))
            }
        } catch (err) { error('Failed to load') } finally { setLoading(false) }
    }

    const totalAmount = useMemo(() => formData.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [formData.items])
    const taxBreakdown = useMemo(() => calculateInvoiceTax(formData.items), [formData.items])
    const isDirty = useMemo(() => initialData && JSON.stringify(formData) !== JSON.stringify(initialData), [formData, initialData])

    const handleDuplicate = async () => { if (!id) return; try { setSaving(true); const newInv = await window.electronAPI.createInvoice({ ...formData, total_amount: totalAmount }); success('Duplicated'); navigate(`/invoices/${newInv.uuid}`) } catch (err) { error('Failed') } finally { setSaving(false) } }
    const handleDelete = async () => { if (!id || !confirm('Delete draft?')) return; try { await window.electronAPI.deleteInvoice(id); success('Deleted'); navigate('/invoices') } catch (err: any) { error(err.message) } }
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); try {
            const data = { ...formData, total_amount: totalAmount }
            if (isEditing) {
                const prev = initialData; setInitialData(data); navigate(`/invoices/${id}`);
                try { await window.electronAPI.updateInvoice(id!, data); success('Saved') } 
                catch (err: any) { setInitialData(prev); error(err.message); navigate(`/invoices/${id}/edit`) }
            } else { const newInv = await window.electronAPI.createInvoice(data); success('Created'); navigate(`/invoices/${newInv.uuid}`) }
        } catch (err: any) { error(err.message) } finally { setSaving(false) }
    }

    const handleMarkPaid = async () => { if (!confirm('Mark as Paid?')) return; try { await window.electronAPI.markInvoicePaid(id!); setInvoiceStatus('PAID'); success('Paid') } catch (err: any) { error(err.message) } }
    const handleCancel = async () => { if (!confirm('Cancel invoice?')) return; try { await window.electronAPI.markInvoiceCancelled(id!); setInvoiceStatus('CANCELLED'); success('Cancelled') } catch (err: any) { error(err.message) } }

    return { id, loading, saving, clients, signatures, invoiceNo, invoiceStatus, formData, setFormData, totalAmount, taxBreakdown, isDirty, handleDuplicate, handleDelete, handleSubmit, handleMarkPaid, handleCancel, loadData, navigate }
}
