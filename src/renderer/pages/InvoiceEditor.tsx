import { useLocation } from 'react-router-dom'
import { useInvoiceLock } from '../components/InvoiceLockWrapper'
import { EditorHeader } from '../components/invoice-editor/EditorHeader'
import { EditorClientSection } from '../components/invoice-editor/EditorClientSection'
import { EditorItemsTable } from '../components/invoice-editor/EditorItemsTable'
import { EditorSummary } from '../components/invoice-editor/EditorSummary'
import { useInvoiceEditor } from '../components/invoice-editor/useInvoiceEditor'
import { FormSkeleton } from '../components/invoice-editor/EditorUIUtils'

export default function InvoiceEditor() {
    const location = useLocation()
    const isEditing = location.pathname.includes('/edit') || location.pathname.match(/\/invoices\/[^/]+$/) !== null
    const isReadOnly = location.pathname.match(/\/invoices\/[a-zA-Z0-9-]+$/) !== null
    
    const vm = useInvoiceEditor(isEditing)
    const { remoteLockedBy } = useInvoiceLock()

    const canEdit = vm.invoiceStatus === 'DRAFT' && !remoteLockedBy
    const effectiveReadOnly = isReadOnly || !canEdit || vm.invoiceStatus === 'PAID'

    const formatCurrency = (amount: number) => new Intl.NumberFormat(vm.formData.currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency: vm.formData.currency }).format(amount)

    if (vm.loading) return <div className="container py-lg"><FormSkeleton isMobile={window.innerWidth < 768} /></div>

    return (
        <div className="container py-lg">
            <EditorHeader 
                invoiceNo={vm.invoiceNo} invoiceStatus={vm.invoiceStatus} isEditing={isEditing} 
                isReadOnly={effectiveReadOnly} saving={vm.saving} onBack={() => vm.navigate(location.state?.fromDashboard ? '/' : (isEditing ? `/invoices/${vm.id}` : '/'))}
                onDuplicate={vm.handleDuplicate} onDelete={vm.handleDelete} onPreview={() => vm.navigate(`/invoices/${vm.id}/preview`)}
                canDelete={vm.invoiceStatus === 'DRAFT'}
            />

            <form onSubmit={vm.handleSubmit}>
                <EditorClientSection 
                    formData={vm.formData} clients={vm.clients} signatures={vm.signatures}
                    isReadOnly={effectiveReadOnly} isMobile={window.innerWidth < 768} onUpdate={(d: any) => vm.setFormData(p => ({ ...p, ...d }))}
                />

                <EditorItemsTable 
                    items={vm.formData.items} isReadOnly={effectiveReadOnly} 
                    onUpdate={(items) => vm.setFormData(p => ({ ...p, items }))}
                />

                <EditorSummary 
                    formData={vm.formData} totalAmount={vm.totalAmount} taxBreakdown={vm.taxBreakdown}
                    isReadOnly={effectiveReadOnly} isMobile={window.innerWidth < 768} onUpdate={(d: any) => vm.setFormData(p => ({ ...p, ...d }))}
                    formatCurrency={formatCurrency}
                />

                {!effectiveReadOnly && (
                    <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                        <button type="button" onClick={() => vm.navigate(-1)} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={vm.saving || (isEditing && !vm.isDirty)}>
                            {vm.saving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Invoice')}
                        </button>
                    </div>
                )}
            </form>
        </div>
    )
}
