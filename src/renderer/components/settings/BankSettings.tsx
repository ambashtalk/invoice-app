import { FC, useState } from 'react'
import { useToast } from '../../contexts/ToastContext'

interface PaymentProfile { id: string; beneficiary_name: string; bank_name: string; account_type: string; branch: string | null; ifsc_code: string | null; account_number: string; is_default: number }

interface BankSettingsProps {
    profiles: PaymentProfile[]
    onRefresh: () => void
}

export const BankSettings: FC<BankSettingsProps> = ({ profiles, onRefresh }) => {
    const { success, error } = useToast()
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ beneficiary_name: '', bank_name: '', account_type: 'Savings Account', branch: '', ifsc_code: '', account_number: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); try {
            await window.electronAPI.createPaymentProfile(form); setShowForm(false)
            setForm({ beneficiary_name: '', bank_name: '', account_type: 'Savings Account', branch: '', ifsc_code: '', account_number: '' })
            onRefresh(); success('Saved')
        } catch (err) { error('Failed') }
    }

    const setDef = async (id: string) => { await window.electronAPI.setDefaultPaymentProfile(id); onRefresh() }

    return (
        <div>
            {showForm ? (
                <div className="card slide-up" style={{ marginBottom: '32px', border: '1px solid var(--color-accent)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h3>Add Payment Profile</h3>
                        <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm">Cancel</button>
                    </div>
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Beneficiary Name</label>
                            <input className="form-input" value={form.beneficiary_name} onChange={e => setForm({...form, beneficiary_name: e.target.value})} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Bank Name</label>
                            <input className="form-input" value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Account Number</label>
                            <input className="form-input" value={form.account_number} onChange={e => setForm({...form, account_number: e.target.value})} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">IFSC Code</label>
                            <input className="form-input" value={form.ifsc_code} onChange={e => setForm({...form, ifsc_code: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Branch</label>
                            <input className="form-input" value={form.branch} onChange={e => setForm({...form, branch: e.target.value})} />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ gridColumn: 'span 2' }}>Save Profile</button>
                    </form>
                </div>
            ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2>Payment Profiles</h2>
                    <button onClick={() => setShowForm(true)} className="btn btn-secondary">+ Add Profile</button>
                </div>
            )}
            {profiles.map(p => (
                <div key={p.id} className="card" style={{ marginBottom: '12px', borderColor: p.is_default ? 'var(--color-accent)' : undefined }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div><label className="card-meta">Beneficiary</label><div>{p.beneficiary_name}</div></div>
                        <div><label className="card-meta">Bank</label><div>{p.bank_name}</div></div>
                        <div><label className="card-meta">Account</label><div style={{ fontFamily: 'var(--font-mono)' }}>{p.account_number}</div></div>
                        <div><label className="card-meta">IFSC</label><div style={{ fontFamily: 'var(--font-mono)' }}>{p.ifsc_code || '—'}</div></div>
                    </div>
                    {!p.is_default && <button onClick={() => setDef(p.id)} className="btn btn-ghost btn-sm" style={{ marginTop: '12px' }}>Set Default</button>}
                </div>
            ))}
        </div>
    )
}
