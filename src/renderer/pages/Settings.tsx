import { useState, useEffect } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useParams } from 'react-router-dom'
import { RichTextEditor } from '../components/RichTextEditor'

interface PaymentProfile {
    id: string
    beneficiary_name: string
    bank_name: string
    account_type: string
    branch: string | null
    ifsc_code: string | null
    account_number: string
    is_default: number
}

interface Signature {
    id: string
    name: string
    image_blob: string
    is_default: number
}

interface SellerInfo {
    name: string
    address: string
    pan: string
    gstin: string
}

interface EmailTemplate {
    id: string
    name: string
    subject: string
    body: string
    is_default: number
}

export default function Settings() {
    const { tab: urlTab } = useParams<{ tab: string }>()
    const { success, error: toastError } = useToast()
    const activeTab = (urlTab as any) || 'seller'
    const [profiles, setProfiles] = useState<PaymentProfile[]>([])
    const [signatures, setSignatures] = useState<Signature[]>([])
    const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [googleConnected, setGoogleConnected] = useState(false)

    const [showBankForm, setShowBankForm] = useState(false)
    const [bankForm, setBankForm] = useState({
        beneficiary_name: '',
        bank_name: '',
        account_type: 'Savings Account',
        branch: '',
        ifsc_code: '',
        account_number: ''
    })

    const [showTemplateForm, setShowTemplateForm] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
    const [templateForm, setTemplateForm] = useState({
        name: '',
        subject: '',
        body: ''
    })

    const [sellerForm, setSellerForm] = useState<SellerInfo>({
        name: '',
        address: '',
        pan: '',
        gstin: ''
    })
    const [sellerSaved, setSellerSaved] = useState(false)

    const [sigName, setSigName] = useState('')
    const [sigUploading, setSigUploading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [syncResult, setSyncResult] = useState<{ synced: number; errors: string[] } | null>(null)
    const [hasCustomAuth, setHasCustomAuth] = useState(false)
    const [showAdvanced, setShowAdvanced] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            const [profilesData, signaturesData, templatesData, seller, connected, customAuth] = await Promise.all([
                window.electronAPI.getPaymentProfiles(),
                window.electronAPI.getSignatures(),
                window.electronAPI.getEmailTemplates(),
                window.electronAPI.getSellerInfo(),
                window.electronAPI.isGoogleConnected(),
                window.electronAPI.hasCustomCredentials()
            ])
            setProfiles(profilesData)
            setSignatures(signaturesData)
            setEmailTemplates(templatesData)
            if (seller) setSellerForm(seller)
            setGoogleConnected(connected)
            setHasCustomAuth(customAuth)
        } catch (error) {
            console.error('Failed to load settings:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleBankSubmit(e: React.FormEvent) {
        e.preventDefault()
        try {
            await window.electronAPI.createPaymentProfile(bankForm)
            setShowBankForm(false)
            setBankForm({ beneficiary_name: '', bank_name: '', account_type: 'Savings Account', branch: '', ifsc_code: '', account_number: '' })
            loadData()
            success('Payment profile saved successfully.')
        } catch (error) {
            console.error('Failed to save payment profile:', error)
            toastError('Failed to save payment profile.')
        }
    }

    async function setDefaultProfile(id: string) {
        try {
            await window.electronAPI.setDefaultPaymentProfile(id)
            loadData()
        } catch (error) {
            console.error('Failed to set default profile:', error)
            toastError('Failed to set default profile.')
        }
    }

    async function handleTemplateSubmit(e: React.FormEvent) {
        e.preventDefault()
        try {
            if (editingTemplate) {
                await window.electronAPI.updateEmailTemplate(editingTemplate.id, templateForm)
                success('Template updated successfully.')
            } else {
                await window.electronAPI.createEmailTemplate(templateForm)
                success('Template created successfully.')
            }
            setShowTemplateForm(false)
            setEditingTemplate(null)
            setTemplateForm({ name: '', subject: '', body: '' })
            loadData()
        } catch (error) {
            console.error('Failed to save template:', error)
            toastError('Failed to save template.')
        }
    }

    async function handleEditTemplate(template: EmailTemplate) {
        setEditingTemplate(template)
        setTemplateForm({
            name: template.name,
            subject: template.subject,
            body: template.body
        })
        setShowTemplateForm(true)
    }

    async function handleDeleteTemplate(id: string) {
        if (!confirm('Delete this template?')) return
        try {
            const success_flag = await window.electronAPI.deleteEmailTemplate(id)
            if (success_flag) {
                success('Template deleted.')
                loadData()
            } else {
                toastError('Cannot delete the default template.')
            }
        } catch (error) {
            console.error('Failed to delete template:', error)
            toastError('Failed to delete template.')
        }
    }

    async function setDefaultTemplate(id: string) {
        try {
            await window.electronAPI.setDefaultEmailTemplate(id)
            loadData()
            success('Default template updated.')
        } catch (error) {
            console.error('Failed to set default template:', error)
            toastError('Failed to set default template.')
        }
    }

    async function handleSellerSave(e: React.FormEvent) {
        e.preventDefault()
        try {
            await window.electronAPI.saveSellerInfo(sellerForm)
            setSellerSaved(true)
            success('Business information saved successfully.')
            setTimeout(() => setSellerSaved(false), 2000)
        } catch (error) {
            console.error('Failed to save seller info:', error)
            toastError('Failed to save business information.')
        }
    }

    async function handleUploadSignature() {
        if (!sigName.trim()) {
            toastError('Please enter a name for the signature')
            return
        }
        setSigUploading(true)
        try {
            const filePath = await window.electronAPI.pickSignatureFile()
            if (!filePath) return

            const processedBase64 = await window.electronAPI.processSignature(filePath)
            await window.electronAPI.createSignature({
                name: sigName.trim(),
                image_blob: processedBase64
            })
            setSigName('')
            loadData()
            success('Signature uploaded successfully.')
        } catch (error) {
            console.error('Failed to upload signature:', error)
            toastError('Signature upload failed.')
        } finally {
            setSigUploading(false)
        }
    }

    async function handleDeleteSignature(id: string) {
        if (!confirm('Delete this signature?')) return
        try {
            await window.electronAPI.deleteSignature(id)
            loadData()
            success('Signature deleted.')
        } catch (error) {
            console.error('Failed to delete signature:', error)
            toastError('Failed to delete signature.')
        }
    }

    async function handleSetDefaultSignature(id: string) {
        try {
            await window.electronAPI.setDefaultSignature(id)
            loadData()
        } catch (error) {
            console.error('Failed to set default signature:', error)
            toastError('Failed to set default signature.')
        }
    }

    async function handleGoogleConnect() {
        setGoogleLoading(true)
        try {
            await window.electronAPI.connectGoogle()
            setGoogleConnected(true)
            success('Google account connected successfully.')
        } catch (error: any) {
            console.error('Google connect failed:', error)
            toastError(`Connection failed: ${error.message}`)
        } finally {
            setGoogleLoading(false)
        }
    }

    async function handleGoogleDisconnect() {
        if (!confirm('Disconnect Google account? This will stop Drive sync and email sending.')) return
        await window.electronAPI.disconnectGoogle()
        setGoogleConnected(false)
    }

    async function handleDriveSync() {
        setGoogleLoading(true)
        setSyncResult(null)
        try {
            const result = await window.electronAPI.syncToDrive()
            setSyncResult(result)
        } catch (error: any) {
            alert(`Sync failed: ${error.message}`)
        } finally {
            setGoogleLoading(false)
        }
    }

    async function handleUploadCredentials() {
        try {
            const uploadSuccess = await window.electronAPI.uploadCustomCredentials()
            if (uploadSuccess) {
                success('Custom credentials loaded successfully.')
                loadData()
            }
        } catch (error: any) {
            toastError('Failed to upload credentials.')
        }
    }

    async function handleDeleteCredentials() {
        if (!confirm('Remove custom credentials? You will need to reconnect Google.')) return
        try {
            await window.electronAPI.deleteCustomCredentials()
            loadData()
            success('Custom credentials removed.')
        } catch (error: any) {
            toastError('Failed to remove credentials.')
        }
    }

    if (loading) {
        return (
            <div className="empty-state">
                <p className="empty-state-description">Loading settings...</p>
            </div>
        )
    }

    return (
        <div style={{ 
            height: '100%',
            overflowY: 'auto',
            padding: 'var(--spacing-xl)',
            scrollBehavior: 'smooth'
        }}>
            <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto' }}>
                <div className="page-header" style={{ marginBottom: 'var(--spacing-2xl)' }}>
                    <div>
                        <h1 className="page-title">Settings</h1>
                        <p className="page-subtitle">Manage your profile, bank details, signatures, and integrations</p>
                    </div>
                </div>

            {/* Business Info Tab */}
            {activeTab === 'seller' && (
                <div>
                    <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>Business / Seller Information</h2>
                    <div className="card">
                        <form onSubmit={handleSellerSave}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Business / Your Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={sellerForm.name}
                                        onChange={e => setSellerForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder="e.g. John Doe Consulting"
                                        required
                                    />
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Address</label>
                                    <textarea
                                        className="form-input"
                                        value={sellerForm.address}
                                        onChange={e => setSellerForm(f => ({ ...f, address: e.target.value }))}
                                        rows={3}
                                        placeholder="Full address as it should appear on invoices"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">PAN Number</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={sellerForm.pan}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSellerForm((f: any) => ({ ...f, pan: e.target.value.toUpperCase() }))}
                                        placeholder="ABCDE1234F"
                                        maxLength={10}
                                        style={{ fontFamily: 'var(--font-mono)' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">GSTIN (optional)</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={sellerForm.gstin}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSellerForm((f: any) => ({ ...f, gstin: e.target.value.toUpperCase() }))}
                                        placeholder="22ABCDE1234F1Z5"
                                        maxLength={15}
                                        style={{ fontFamily: 'var(--font-mono)' }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'flex-end', marginTop: 'var(--spacing-md)' }}>
                                <button type="submit" className="btn btn-primary">
                                    {sellerSaved ? '✓ Saved!' : 'Save Business Info'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bank Details Tab */}
            {activeTab === 'bank' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                        <h2>Payment Profiles</h2>
                        <button onClick={() => { setBankForm({ beneficiary_name: '', bank_name: '', account_type: 'Savings Account', branch: '', ifsc_code: '', account_number: '' }); setShowBankForm(true); }} className="btn btn-secondary">
                            + Add Profile
                        </button>
                    </div>

                    {showBankForm && (
                        <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                            <h3 style={{ marginBottom: 'var(--spacing-lg)' }}>New Payment Profile</h3>
                            <form onSubmit={handleBankSubmit}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                    <div className="form-group">
                                        <label className="form-label">Beneficiary Name *</label>
                                        <input type="text" className="form-input" value={bankForm.beneficiary_name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBankForm((d: any) => ({ ...d, beneficiary_name: e.target.value }))} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Bank Name *</label>
                                        <input type="text" className="form-input" value={bankForm.bank_name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBankForm((d: any) => ({ ...d, bank_name: e.target.value }))} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Account Type</label>
                                        <select className="form-select" value={bankForm.account_type} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBankForm((d: any) => ({ ...d, account_type: e.target.value }))}>
                                            <option>Savings Account</option>
                                            <option>Current Account</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Branch</label>
                                        <input type="text" className="form-input" value={bankForm.branch} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBankForm((d: any) => ({ ...d, branch: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">IFSC Code</label>
                                        <input type="text" className="form-input" value={bankForm.ifsc_code} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBankForm((d: any) => ({ ...d, ifsc_code: e.target.value.toUpperCase() }))} maxLength={11} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Account Number *</label>
                                        <input type="text" className="form-input" value={bankForm.account_number} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBankForm((d: any) => ({ ...d, account_number: e.target.value }))} required />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'flex-end' }}>
                                    <button type="button" onClick={() => setShowBankForm(false)} className="btn btn-ghost">Cancel</button>
                                    <button type="submit" className="btn btn-primary">Save Profile</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {profiles.length === 0 ? (
                        <div className="empty-state">
                            <h3 className="empty-state-title">No payment profiles</h3>
                            <p className="empty-state-description">Add your bank details to display on invoices.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            {profiles.map((profile: any) => (
                                <div key={profile.id} className="card" style={{ borderColor: profile.is_default ? 'var(--color-accent)' : undefined, position: 'relative' }}>
                                    {Boolean(profile.is_default) && (
                                        <span className="badge badge-sent" style={{ position: 'absolute', top: 'var(--spacing-md)', right: 'var(--spacing-md)' }}>Default</span>
                                    )}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                        <div><span className="card-meta">Beneficiary</span><div>{profile.beneficiary_name}</div></div>
                                        <div><span className="card-meta">Bank</span><div>{profile.bank_name}</div></div>
                                        <div><span className="card-meta">Account</span><div style={{ fontFamily: 'var(--font-mono)' }}>{profile.account_number}</div></div>
                                        <div><span className="card-meta">IFSC</span><div style={{ fontFamily: 'var(--font-mono)' }}>{profile.ifsc_code || '—'}</div></div>
                                    </div>
                                    {!profile.is_default && (
                                        <button onClick={() => setDefaultProfile(profile.id)} className="btn btn-ghost btn-sm" style={{ marginTop: 'var(--spacing-md)' }}>
                                            Set as Default
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Signatures Tab */}
            {activeTab === 'signatures' && (
                <div>
                    <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>Digital Signatures</h2>

                    {/* Upload form */}
                    <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
                        <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Upload Signature</h3>
                        <p className="card-meta" style={{ marginBottom: 'var(--spacing-md)' }}>
                            Upload a photo/scan of your signature. White backgrounds will be removed automatically.
                        </p>
                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'flex-end' }}>
                            <div className="form-group" style={{ flex: 1, margin: 0 }}>
                                <label className="form-label">Signature Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={sigName}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSigName(e.target.value)}
                                    placeholder="e.g. Main Signature"
                                />
                            </div>
                            <button
                                onClick={handleUploadSignature}
                                className="btn btn-secondary"
                                disabled={sigUploading || !sigName.trim()}
                                style={{ flexShrink: 0 }}
                            >
                                {sigUploading ? 'Processing...' : '+ Pick & Upload Image'}
                            </button>
                        </div>
                    </div>

                    {signatures.length === 0 ? (
                        <div className="empty-state">
                            <h3 className="empty-state-title">No signatures</h3>
                            <p className="empty-state-description">Upload a signature to display on your invoices.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
                            {signatures.map((sig: any) => (
                                <div key={sig.id} className="card" style={{ textAlign: 'center', position: 'relative', borderColor: sig.is_default ? 'var(--color-accent)' : undefined }}>
                                    {Boolean(sig.is_default) && (
                                        <span className="badge badge-sent" style={{ position: 'absolute', top: 'var(--spacing-xs)', right: 'var(--spacing-xs)' }}>Default</span>
                                    )}
                                    <div style={{ background: 'repeating-conic-gradient(#eee 0% 25%, white 0% 50%) 0 0 / 16px 16px', borderRadius: '4px', padding: '12px', margin: '16px 0 8px 0' }}>
                                        <img
                                            src={`data:image/png;base64,${sig.image_blob}`}
                                            alt={sig.name}
                                            style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain' }}
                                        />
                                    </div>
                                    <p style={{ fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>{sig.name}</p>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', justifyContent: 'center' }}>
                                        {!sig.is_default && (
                                            <button
                                                onClick={() => handleSetDefaultSignature(sig.id)}
                                                className="btn btn-ghost btn-sm"
                                            >
                                                Set Default
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeleteSignature(sig.id)}
                                            className="btn btn-ghost btn-sm"
                                            style={{ color: 'var(--color-error)' }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Email Templates Tab */}
            {activeTab === 'email-templates' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                        <h2>Email Templates</h2>
                        <button onClick={() => { setEditingTemplate(null); setTemplateForm({ name: '', subject: '', body: '' }); setShowTemplateForm(true); }} className="btn btn-secondary">
                            + Add Template
                        </button>
                    </div>

                    {showTemplateForm && (
                        <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                            <h3 style={{ marginBottom: 'var(--spacing-lg)' }}>{editingTemplate ? 'Edit Template' : 'New Template'}</h3>
                            <form onSubmit={handleTemplateSubmit}>
                                <div className="form-group">
                                    <label className="form-label">Template Name *</label>
                                    <input type="text" className="form-input" value={templateForm.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemplateForm((t: any) => ({ ...t, name: e.target.value }))} required placeholder="e.g. Standard Invoice" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Subject Line *</label>
                                    <input type="text" className="form-input" value={templateForm.subject} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemplateForm((t: any) => ({ ...t, subject: e.target.value }))} required placeholder="e.g. Invoice {{invoice_no}} from MyBusiness" />
                                </div>
                                <RichTextEditor 
                                    label="Email Body *" 
                                    value={templateForm.body} 
                                    onChange={(v: string) => setTemplateForm({ ...templateForm, body: v })} 
                                    placeholder="Dear {{client_name}}, ..."
                                />
                                <p className="card-meta" style={{ marginTop: '-12px', marginBottom: 'var(--spacing-md)' }}>Available placeholders: {'{{invoice_no}}'}, {'{{client_name}}'}, {'{{total_amount}}'}, {'{{currency}}'}</p>
                                <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'flex-end' }}>
                                    <button type="button" onClick={() => { setShowTemplateForm(false); setEditingTemplate(null); }} className="btn btn-ghost">Cancel</button>
                                    <button type="submit" className="btn btn-primary">Save Template</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {emailTemplates.length === 0 ? (
                        <div className="empty-state">
                            <h3 className="empty-state-title">No email templates</h3>
                            <p className="empty-state-description">Add templates to reuse subjects and bodies when sending invoices.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            {emailTemplates.map((template: any) => (
                                <div key={template.id} className="card" style={{ borderColor: template.is_default ? 'var(--color-accent)' : undefined, position: 'relative' }}>
                                    {Boolean(template.is_default) && (
                                        <span className="badge badge-sent" style={{ position: 'absolute', top: 'var(--spacing-md)', right: 'var(--spacing-md)' }}>Default</span>
                                    )}
                                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                        <h4 style={{ margin: '0 0 var(--spacing-xs) 0' }}>{template.name}</h4>
                                        <div style={{ color: 'var(--color-accent)', fontSize: '0.9rem', marginBottom: 'var(--spacing-xs)' }}>{template.subject}</div>
                                        <p className="card-meta" 
                                           style={{ 
                                               marginTop: 'var(--spacing-sm)', 
                                               display: '-webkit-box', 
                                               WebkitLineClamp: 2, 
                                               WebkitBoxOrient: 'vertical', 
                                               overflow: 'hidden',
                                               maxHeight: '40px'
                                           }}
                                           dangerouslySetInnerHTML={{ __html: template.body.replace(/<[^>]*>?/gm, ' ') }} 
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                                        {!template.is_default && (
                                            <button onClick={() => setDefaultTemplate(template.id)} className="btn btn-ghost btn-sm">
                                                Set as Default
                                            </button>
                                        )}
                                        <button onClick={() => handleEditTemplate(template)} className="btn btn-ghost btn-sm">
                                            Edit
                                        </button>
                                        {!template.is_default && (
                                            <button onClick={() => handleDeleteTemplate(template.id)} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)' }}>
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

                    {/* Google Tab */}
                    {activeTab === 'google' && (
                        <div>
                            <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>Google Integration</h2>
                            <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h3>Google Account</h3>
                                        <p className="card-meta" style={{ marginTop: 'var(--spacing-sm)' }}>
                                            {googleConnected
                                                ? 'Connected — Drive sync and Gmail sending are enabled'
                                                : 'Not connected — Connect to enable Drive sync and email sending'}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                                        {googleConnected ? (
                                            <button onClick={handleGoogleDisconnect} className="btn btn-ghost" style={{ color: 'var(--color-error)' }}>
                                                Disconnect
                                            </button>
                                        ) : (
                                            <button onClick={handleGoogleConnect} className="btn btn-primary" disabled={googleLoading}>
                                                {googleLoading ? 'Connecting...' : 'Connect Google'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {googleConnected && (
                                <div className="card">
                                    <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Drive Sync</h3>
                                    <p className="card-meta" style={{ marginBottom: 'var(--spacing-lg)' }}>
                                        Sync all draft/scheduled invoice metadata to your Google Drive folder.
                                    </p>
                                    <button onClick={handleDriveSync} className="btn btn-secondary" disabled={googleLoading}>
                                        {googleLoading ? 'Syncing...' : '↻ Sync Now'}
                                    </button>
                                    {syncResult && (
                                        <div style={{ marginTop: 'var(--spacing-md)' }}>
                                            <p style={{ color: 'var(--color-success, #22c55e)' }}>
                                                ✓ {syncResult.synced} invoice{syncResult.synced !== 1 ? 's' : ''} synced
                                            </p>
                                            {syncResult.errors && syncResult.errors.length > 0 && (
                                                <ul style={{ color: 'var(--color-error)', marginTop: 'var(--spacing-sm)', fontSize: '0.875rem' }}>
                                                    {syncResult.errors.map((err: string, i: number) => <li key={i}>{err}</li>)}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {!googleConnected && (
                                <div className="card" style={{ opacity: 0.8 }}>
                                    <p className="card-meta">
                                        Google integration enables <strong>Gmail sending</strong> and <strong>Drive metadata sync</strong>.
                                        Click Connect to authorize the app securely.
                                    </p>
                                </div>
                            )}

                            {/* Advanced BYOK Settings */}
                            <div style={{ marginTop: 'var(--spacing-xl)' }}>
                                <button 
                                    onClick={() => setShowAdvanced(!showAdvanced)} 
                                    style={{ 
                                        background: 'none', border: 'none', cursor: 'pointer', 
                                        color: 'var(--color-meta, #666)', fontSize: '0.875rem', 
                                        display: 'flex', alignItems: 'center', gap: '4px' 
                                    }}
                                >
                                    {showAdvanced ? '▼ Hide Advanced' : '▶ Show Advanced (Bring Your Own Key)'}
                                </button>
                                
                                {showAdvanced && (
                                    <div className="card" style={{ marginTop: 'var(--spacing-md)', border: '1px dashed var(--border-color)' }}>
                                        <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Custom API Credentials</h3>
                                        <p className="card-meta" style={{ marginBottom: 'var(--spacing-md)' }}>
                                            By default, the app uses built-in Google Cloud credentials. If you hit API limits or prefer complete privacy, 
                                            you can provide your own <code>credentials.json</code> from Google Cloud Console.
                                        </p>
                                        
                                        {hasCustomAuth ? (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--spacing-sm)', background: 'var(--bg-layer-2)', borderRadius: '4px' }}>
                                                <span><span style={{ color: 'var(--color-success)', marginRight: '8px' }}>✓</span> Custom credentials loaded</span>
                                                <button onClick={handleDeleteCredentials} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)' }}>
                                                    Remove Custom Key
                                                </button>
                                            </div>
                                        ) : (
                                            <button onClick={handleUploadCredentials} className="btn btn-secondary">
                                                Upload credentials.json
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
        </div>
    )
}
