import { FC, useState } from 'react'
import { RichTextEditor } from '../RichTextEditor'
import { useToast } from '../../contexts/ToastContext'

interface EmailTemplate { id: string; name: string; subject: string; body: string; is_default: number; is_system?: boolean }

interface EmailTemplateSettingsProps {
    templates: EmailTemplate[]
    onRefresh: () => void
}

export const EmailTemplateSettings: FC<EmailTemplateSettingsProps> = ({ templates, onRefresh }) => {
    const { success, error } = useToast()
    const [editing, setEditing] = useState<EmailTemplate | null>(null)
    const [form, setForm] = useState({ name: '', subject: '', body: '' })
    const [showForm, setShowForm] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); try {
            if (editing) await window.electronAPI.updateEmailTemplate(editing.id, form)
            else await window.electronAPI.createEmailTemplate(form)
            setShowForm(false); setEditing(null); success('Saved'); onRefresh()
        } catch (err) { error('Failed') }
    }

    const openEdit = (t: EmailTemplate) => { setEditing(t); setForm({ name: t.name, subject: t.subject, body: t.body }); setShowForm(true) }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>Email Templates</h2>
                <button onClick={() => { setEditing(null); setForm({ name: '', subject: '', body: '' }); setShowForm(true) }} className="btn btn-secondary">+ Add Template</button>
            </div>
            {showForm && (
                <div className="card" style={{ marginBottom: '24px' }}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
                        <div className="form-group"><label className="form-label">Subject</label><input className="form-input" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required /></div>
                        <RichTextEditor label="Body" value={form.body} onChange={v => setForm({ ...form, body: v })} />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                            <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
                            <button type="submit" className="btn btn-primary">Save</button>
                        </div>
                    </form>
                </div>
            )}
            {templates.map(t => (
                <div key={t.id} className="card" style={{ marginBottom: '12px', borderColor: t.is_default ? 'var(--color-accent)' : undefined }}>
                    <h4 style={{ margin: 0 }}>{t.name} {t.is_system && '(System)'}</h4>
                    <p className="card-meta" style={{ marginTop: '4px' }}>{t.subject}</p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        {!t.is_system && <button onClick={() => openEdit(t)} className="btn btn-ghost btn-sm">Edit</button>}
                        {!t.is_default && !t.is_system && <button onClick={async () => { await window.electronAPI.setDefaultEmailTemplate(t.id); onRefresh() }} className="btn btn-ghost btn-sm">Set Default</button>}
                    </div>
                </div>
            ))}
        </div>
    )
}
