import { FC, useState } from 'react'
import { useToast } from '../../contexts/ToastContext'

interface SellerInfo { name: string; address: string; pan: string; gstin: string }

interface SellerSettingsProps {
    initialData: SellerInfo
    onRefresh: () => void
}

export const SellerSettings: FC<SellerSettingsProps> = ({ initialData, onRefresh }) => {
    const { success, error } = useToast()
    const [form, setForm] = useState<SellerInfo>(initialData)
    const [saving, setSaving] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); try {
            await window.electronAPI.saveSellerInfo(form); success('Saved'); onRefresh()
        } catch (err) { error('Failed') } finally { setSaving(false) }
    }

    return (
        <div className="card">
            <h2 style={{ marginBottom: '16px' }}>Business Information</h2>
            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                    <div className="form-group">
                        <label className="form-label">Business Name *</label>
                        <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Address</label>
                        <textarea className="form-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={3} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="form-group">
                            <label className="form-label">PAN Number</label>
                            <input className="form-input" value={form.pan} onChange={e => setForm(f => ({ ...f, pan: e.target.value.toUpperCase() }))} maxLength={10} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">GSTIN</label>
                            <input className="form-input" value={form.gstin} onChange={e => setForm(f => ({ ...f, gstin: e.target.value.toUpperCase() }))} maxLength={15} />
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                </div>
            </form>
        </div>
    )
}
