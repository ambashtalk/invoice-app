import { useState } from 'react'
import { useToast } from '../contexts/ToastContext'

export default function Login({ onConnect }: { onConnect: () => void }) {
    const [loading, setLoading] = useState(false)
    const { success, error } = useToast()

    const handleLogin = async () => {
        setLoading(true)
        try {
            const connected = await window.electronAPI.connectGoogle()
            if (connected) {
                success('Successfully connected to Google Drive.')
                onConnect()
            }
        } catch (e: any) {
            error(e.message || 'Failed to connect to Google.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ 
            height: '100vh', 
            width: '100vw', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.1), transparent), radial-gradient(circle at bottom left, rgba(139, 92, 246, 0.05), transparent)'
        }}>
            <div className="card" style={{ 
                maxWidth: '400px', 
                width: '90%', 
                textAlign: 'center', 
                padding: 'var(--spacing-2xl)',
                background: 'rgba(24, 24, 27, 0.8)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <div className="logo" style={{ fontSize: '2.5rem', marginBottom: 'var(--spacing-md)' }}>
                    Prism
                </div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--spacing-xs)' }}>
                    Welcome Back
                </h1>
                <p className="card-meta" style={{ marginBottom: 'var(--spacing-2xl)' }}>
                    Sign in with Google to access your cloud-synced invoices.
                </p>

                <button 
                    onClick={handleLogin}
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ 
                        width: '100%', 
                        height: '48px', 
                        fontSize: '1rem',
                        gap: '12px'
                    }}
                >
                    {loading ? (
                        'Connecting...'
                    ) : (
                        <>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.27.81-.57z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            Continue with Google
                        </>
                    )}
                </button>

                <p style={{ marginTop: 'var(--spacing-xl)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Your data is stored securely in your private Google Drive.
                </p>
            </div>
        </div>
    )
}
