import { useState, useEffect } from 'react'
import { ConflictResolver } from '../components/ConflictResolver'

interface Client {
    uuid: string
    name: string
    email: string | null
    address: string | null
    gstin: string | null
    has_conflict?: number
    conflict_data?: string | null
}

export default function ClientList() {
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingClient, setEditingClient] = useState<Client | null>(null)
    const [formData, setFormData] = useState({ name: '', email: '', address: '', gstin: '' })

    // Conflict state
    const [conflictClient, setConflictClient] = useState<Client | null>(null)

    useEffect(() => { loadClients() }, [])

    async function loadClients() {
        try {
            const data = await window.electronAPI.getClients()
            setClients(data)
        } catch (error) {
            console.error('Failed to load clients:', error)
        } finally {
            setLoading(false)
        }
    }

    function openNewForm() {
        setFormData({ name: '', email: '', address: '', gstin: '' })
        setEditingClient(null)
        setShowForm(true)
    }

    function openEditForm(client: Client) {
        setFormData({ name: client.name, email: client.email || '', address: client.address || '', gstin: client.gstin || '' })
        setEditingClient(client)
        setShowForm(true)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        try {
            if (editingClient) {
                await window.electronAPI.updateClient(editingClient.uuid, formData)
            } else {
                await window.electronAPI.createClient(formData)
            }
            setShowForm(false)
            loadClients()
        } catch (error) {
            console.error('Failed to save client:', error)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this client?')) return
        try {
            await window.electronAPI.deleteClient(id)
            loadClients()
        } catch (error) {
            console.error('Failed to delete client:', error)
        }
    }

    async function handleResolveConflict(resolvedData: any) {
        if (!conflictClient) return
        try {
            await (window.electronAPI as any).resolveClientConflict(conflictClient.uuid, resolvedData)
            setConflictClient(null)
            loadClients()
        } catch (error) {
            console.error('Failed to resolve conflict:', error)
        }
    }

    const conflictingClients = clients.filter(c => c.has_conflict)

    if (loading) {
        return (
            <div className="empty-state">
                <p className="empty-state-description">Loading clients...</p>
            </div>
        )
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Clients</h1>
                    <p className="page-subtitle">Manage your client directory</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                    {conflictingClients.length > 0 && (
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                background: 'rgba(239,68,68,0.12)',
                                color: 'var(--color-error)',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                border: '1px solid rgba(239,68,68,0.3)'
                            }}
                        >
                            ⚠️ {conflictingClients.length} sync conflict{conflictingClients.length !== 1 ? 's' : ''}
                        </span>
                    )}
                    <button onClick={openNewForm} className="btn btn-primary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add Client
                    </button>
                </div>
            </div>

            {/* Add/Edit Modal Form */}
            {showForm && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
                    onClick={() => setShowForm(false)}
                >
                    <div className="card" style={{ width: '100%', maxWidth: '480px', margin: 'var(--spacing-lg)' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>
                            {editingClient ? 'Edit Client' : 'New Client'}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Company / Name *</label>
                                <input type="text" className="form-input" value={formData.name} onChange={e => setFormData(d => ({ ...d, name: e.target.value }))} required placeholder="Acme Corporation" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input type="email" className="form-input" value={formData.email} onChange={e => setFormData(d => ({ ...d, email: e.target.value }))} placeholder="billing@company.com" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Address</label>
                                <textarea className="form-textarea" value={formData.address} onChange={e => setFormData(d => ({ ...d, address: e.target.value }))} placeholder="123 Business Street, City - 560001" style={{ minHeight: '80px' }} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">GSTIN</label>
                                <input type="text" className="form-input" value={formData.gstin} onChange={e => setFormData(d => ({ ...d, gstin: e.target.value.toUpperCase() }))} placeholder="29XXXXX1234XXXX" maxLength={15} />
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
                                <button type="submit" className="btn btn-primary">{editingClient ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Conflict Resolver Modal */}
            {conflictClient && (
                <ConflictResolver
                    title={`Sync Conflict — ${conflictClient.name}`}
                    localData={conflictClient}
                    remoteData={JSON.parse(conflictClient.conflict_data || '{}')}
                    onResolve={handleResolveConflict}
                    ignoredKeys={['uuid', 'updated_at', 'last_synced_at', 'has_conflict', 'conflict_data']}
                />
            )}

            {clients.length === 0 ? (
                <div className="empty-state">
                    <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                    </svg>
                    <h3 className="empty-state-title">No clients yet</h3>
                    <p className="empty-state-description">Add your clients to quickly create invoices for them.</p>
                    <button onClick={openNewForm} className="btn btn-primary">Add Client</button>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>GSTIN</th>
                                <th style={{ width: '160px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.map(client => (
                                <tr key={client.uuid} style={{ background: client.has_conflict ? 'rgba(239,68,68,0.04)' : undefined }}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                            <strong>{client.name}</strong>
                                            {Boolean(client.has_conflict) && (
                                                <span
                                                    style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(239,68,68,0.15)', color: 'var(--color-error)', borderRadius: '4px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                    onClick={() => setConflictClient(client)}
                                                >
                                                    ⚠ CONFLICT
                                                </span>
                                            )}
                                        </div>
                                        {client.address && (
                                            <div className="card-meta" style={{ marginTop: '4px' }}>
                                                {client.address.split('\n')[0]}
                                            </div>
                                        )}
                                    </td>
                                    <td>{client.email || '—'}</td>
                                    <td>
                                        <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                                            {client.gstin || '—'}
                                        </code>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                            {Boolean(client.has_conflict) ? (
                                                <button onClick={() => setConflictClient(client)} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)' }}>
                                                    Resolve
                                                </button>
                                            ) : (
                                                <button onClick={() => openEditForm(client)} className="btn btn-ghost btn-sm">Edit</button>
                                            )}
                                            <button onClick={() => handleDelete(client.uuid)} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)' }}>
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
