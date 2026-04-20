import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { NetworkProvider } from './contexts/NetworkContext'
import { ToastProvider } from './contexts/ToastContext'
import Layout from './components/Layout'
import InvoiceList from './pages/InvoiceList'
import InvoiceEditor from './pages/InvoiceEditor'
import InvoicePDF from './pages/InvoicePDF'
import ClientList from './pages/ClientList'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Reports from './pages/Reports'
import InvoiceLockWrapper from './components/InvoiceLockWrapper'

export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

    useEffect(() => {
        checkAuth()
    }, [])

    const checkAuth = async () => {
        try {
            const connected = await window.electronAPI.isGoogleConnected()
            setIsAuthenticated(connected)
        } catch {
            setIsAuthenticated(false)
        }
    }

    if (isAuthenticated === null) {
        return (
            <div className="empty-state" style={{ height: '100vh', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="status-dot online" style={{ width: '12px', height: '12px', margin: '0 auto 16px' }}></div>
                    <h1 className="logo" style={{ fontSize: '2rem', marginBottom: '8px' }}>Prism</h1>
                    <p className="page-subtitle">Verifying secure session...</p>
                </div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return (
            <ToastProvider>
                <Login onConnect={() => setIsAuthenticated(true)} />
            </ToastProvider>
        )
    }

    return (
        <NetworkProvider>
            <ToastProvider>
                <HashRouter>
                    <Routes>
                        <Route path="/" element={<Layout />}>
                            <Route index element={<InvoiceList />} />
                            <Route path="invoices/new" element={<InvoiceEditor />} />
                            <Route path="invoices/:id" element={<InvoiceLockWrapper />}>
                                <Route index element={<InvoiceEditor />} />
                                <Route path="edit" element={<InvoiceEditor />} />
                                <Route path="preview" element={<InvoicePDF />} />
                            </Route>
                            <Route path="clients" element={<ClientList />} />
                            <Route path="settings/:tab?" element={<Settings />} />
                            <Route path="reports" element={<Reports />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Route>
                    </Routes>
                </HashRouter>
            </ToastProvider>
        </NetworkProvider>
    )
}
