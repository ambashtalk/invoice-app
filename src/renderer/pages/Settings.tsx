import { useParams, Link } from 'react-router-dom'
import { useSettings } from '../components/settings/useSettings'
import { SellerSettings } from '../components/settings/SellerSettings'
import { BankSettings } from '../components/settings/BankSettings'
import { SignatureSettings } from '../components/settings/SignatureSettings'
import { EmailTemplateSettings } from '../components/settings/EmailTemplateSettings'
import { GoogleSettings } from '../components/settings/GoogleSettings'

export default function Settings() {
    const { tab = 'seller' } = useParams<{ tab: string }>()
    const { profiles, signatures, emailTemplates, sellerInfo, loading, googleConnected, hasCustomAuth, loadData } = useSettings()

    if (loading) return <div className="empty-state"><p>Loading settings...</p></div>

    const tabs = [
        { id: 'seller', label: 'Business' }, { id: 'bank', label: 'Bank Details' },
        { id: 'signatures', label: 'Signatures' }, { id: 'email-templates', label: 'Email' },
        { id: 'google', label: 'Google Integration' }
    ]

    return (
        <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
            <h1 className="page-title" style={{ marginBottom: '24px' }}>Settings</h1>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', borderBottom: '1px solid var(--color-border)', paddingBottom: '1px' }}>
                {tabs.map(t => (
                    <Link key={t.id} to={`/settings/${t.id}`} className={`btn ${tab === t.id ? 'btn-secondary' : 'btn-ghost'}`} style={{ borderRadius: '8px 8px 0 0', borderBottom: tab === t.id ? '2px solid var(--color-accent)' : 'none' }}>
                        {t.label}
                    </Link>
                ))}
            </div>
            <div className="settings-content">
                {tab === 'seller' && <SellerSettings initialData={sellerInfo || { name: '', address: '', pan: '', gstin: '' }} onRefresh={loadData} />}
                {tab === 'bank' && <BankSettings profiles={profiles} onRefresh={loadData} />}
                {tab === 'signatures' && <SignatureSettings signatures={signatures} onRefresh={loadData} />}
                {tab === 'email-templates' && <EmailTemplateSettings templates={emailTemplates} onRefresh={loadData} />}
                {tab === 'google' && <GoogleSettings connected={googleConnected} hasCustomAuth={hasCustomAuth} onRefresh={loadData} />}
            </div>
        </div>
    )
}
