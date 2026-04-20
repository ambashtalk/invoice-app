import { FC, useState } from 'react'
import { useToast } from '../../contexts/ToastContext'

interface GoogleSettingsProps {
    connected: boolean
    hasCustomAuth: boolean
    onRefresh: () => void
}

export const GoogleSettings: FC<GoogleSettingsProps> = ({ connected, hasCustomAuth, onRefresh }) => {
    const { success, error } = useToast()
    const [loading, setLoading] = useState(false)
    const [syncResult, setSyncResult] = useState<any>(null)
    const [showAdvanced, setShowAdvanced] = useState(false)

    const handleConnect = async () => {
        setLoading(true); try { await window.electronAPI.connectGoogle(); onRefresh(); success('Connected') }
        catch (err: any) { error(err.message) } finally { setLoading(false) }
    }

    const handleDisconnect = async () => {
        if (confirm('Disconnect? This wipes local data.')) { await window.electronAPI.logout(); window.location.reload() }
    }

    const handleSync = async () => {
        setLoading(true); setSyncResult(null); try {
            const res = await window.electronAPI.syncToDrive(); setSyncResult(res)
        } catch (err: any) { error(err.message) } finally { setLoading(false) }
    }

    const handleCredentials = async () => {
        const ok = await window.electronAPI.uploadCustomCredentials(); if (ok) { success('Credentials loaded'); onRefresh() }
    }

    return (
        <div>
            <h2 style={{ marginBottom: '16px' }}>Google Integration</h2>
            <div className="card" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3>Account Status</h3>
                        <p className="card-meta">{connected ? 'Connected' : 'Not connected'}</p>
                    </div>
                    {connected ? (
                        <button onClick={handleDisconnect} className="btn btn-ghost" style={{ color: 'var(--color-error)' }}>Disconnect</button>
                    ) : (
                        <button onClick={handleConnect} className="btn btn-primary" disabled={loading}>{loading ? 'Connecting...' : 'Connect Google'}</button>
                    )}
                </div>
            </div>

            {connected && (
                <div className="card">
                    <h3>Drive Sync</h3>
                    <p className="card-meta">Sync data across devices automatically using Server-Wins resolution.</p>
                    <button onClick={handleSync} className="btn btn-secondary" disabled={loading} style={{ marginTop: '16px' }}>
                        {loading ? 'Syncing...' : 'Sync Now'}
                    </button>
                    {syncResult && <p style={{ color: 'var(--color-success)', marginTop: '12px' }}>✓ {syncResult.synced} items synced.</p>}
                </div>
            )}

            <div style={{ marginTop: '32px' }}>
                <button onClick={() => setShowAdvanced(!showAdvanced)} className="btn btn-ghost btn-sm">
                    {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
                </button>
                {showAdvanced && (
                    <div className="card" style={{ marginTop: '16px' }}>
                        <h3>Custom OAuth Credentials (BYOK)</h3>
                        <p className="card-meta">Upload your own client_secret.json to use your own Google Cloud Project.</p>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                            <button onClick={handleCredentials} className="btn btn-secondary btn-sm">{hasCustomAuth ? 'Update' : 'Upload'} JSON</button>
                            {hasCustomAuth && <button onClick={async () => { await window.electronAPI.deleteCustomCredentials(); onRefresh() }} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)' }}>Remove</button>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
