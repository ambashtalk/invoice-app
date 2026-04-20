import { FC, useState } from 'react'
import { IconTrash } from '../Icons'
import { useToast } from '../../contexts/ToastContext'

interface Signature { id: string; name: string; image_blob: string; is_default: number }

interface SignatureSettingsProps {
    signatures: Signature[]
    onRefresh: () => void
}

export const SignatureSettings: FC<SignatureSettingsProps> = ({ signatures, onRefresh }) => {
    const { success, error } = useToast()
    const [name, setName] = useState('')
    const [uploading, setUploading] = useState(false)

    const handleUpload = async () => {
        setUploading(true); try {
            const path = await window.electronAPI.pickSignatureFile(); if (!path) return
            let finalName = name.trim() || path.split(/[\\/]/).pop()?.split('.')[0] || 'Signature'
            const base64 = await window.electronAPI.processSignature(path)
            await window.electronAPI.createSignature({ name: finalName, image_blob: base64 })
            setName(''); onRefresh(); success('Uploaded')
        } catch (err) { error('Upload failed') } finally { setUploading(false) }
    }

    return (
        <div>
            <div className="card" style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '16px' }}>Upload Signature</h3>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <label className="form-label">Name</label>
                        <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Main Signature" />
                    </div>
                    <button onClick={handleUpload} className="btn btn-secondary" disabled={uploading}>
                        {uploading ? 'Processing...' : '+ Upload Image'}
                    </button>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {signatures.map(sig => (
                    <div key={sig.id} className="card" style={{ textAlign: 'center', borderColor: sig.is_default ? 'var(--color-accent)' : undefined }}>
                        <div style={{ background: 'white', borderRadius: '4px', padding: '12px', marginBottom: '8px' }}>
                            <img src={`data:image/png;base64,${sig.image_blob}`} alt={sig.name} style={{ maxHeight: '80px', maxWidth: '100%' }} />
                        </div>
                        <p style={{ fontWeight: 600, fontSize: '14px' }}>{sig.name}</p>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '8px' }}>
                            {!sig.is_default && <button onClick={async () => { await window.electronAPI.setDefaultSignature(sig.id); onRefresh() }} className="btn btn-ghost btn-sm">Default</button>}
                            <button onClick={async () => { if (confirm('Delete?')) { await window.electronAPI.deleteSignature(sig.id); onRefresh() } }} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)' }}><IconTrash /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
