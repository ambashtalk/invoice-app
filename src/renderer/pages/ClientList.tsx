import { useState } from 'react'
import { useClients } from '../components/client-list/useClients'
import { IconPencil, IconTrash } from '../components/Icons'

export default function ClientList() {
    const { clients, loading, deleteClient, refresh } = useClients()
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<any>(null)
    const [form, setForm] = useState({ name: '', email: '', address: '', gstin: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            if (editing) await window.electronAPI.updateClient(editing.uuid, form)
            else await window.electronAPI.createClient(form)
            setShowForm(false); setEditing(null); setForm({ name: '', email: '', address: '', gstin: '' })
            refresh()
        } catch (err) { console.error(err) }
    }

    if (loading) return <div className="empty-state"><p>Loading clients...</p></div>

    return (
        <div className="container py-lg">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h1 className="h1">Clients</h1>
                <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn btn-primary">+ New Client</button>
            </div>

            {showForm && (
                <div className="card" style={{ marginBottom: '32px' }}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group"><label className="form-label">Client Name</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">GSTIN</label><input className="form-input" value={form.gstin} onChange={e => setForm({ ...form, gstin: e.target.value.toUpperCase() })} maxLength={15} /></div>
                        </div>
                        <div className="form-group"><label className="form-label">Address</label><textarea className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} /></div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
                            <button type="submit" className="btn btn-primary">Save</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card">
                <table className="table">
                    <thead><tr><th>Client Details</th><th>Email</th><th>Actions</th></tr></thead>
                    <tbody>
                        {clients.map(c => (
                            <tr key={c.uuid}>
                                <td><strong>{c.name}</strong><div className="card-meta">{c.gstin || 'No GSTIN'}</div></td>
                                <td>{c.email || '—'}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button onClick={() => { setEditing(c); setForm({ name: c.name, email: c.email || '', address: c.address || '', gstin: c.gstin || '' }); setShowForm(true) }} className="btn btn-ghost btn-sm btn-icon" data-tooltip="Edit"><IconPencil /></button>
                                        <button onClick={() => deleteClient(c.uuid)} className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--color-error)' }} data-tooltip="Delete"><IconTrash /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
