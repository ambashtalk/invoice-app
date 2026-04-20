import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useNetwork } from '../contexts/NetworkContext'

export default function Layout() {
    const { isOnline } = useNetwork()
    const location = useLocation()
    const [pendingCount, setPendingCount] = useState(0)
    const [isSettingsExpanded, setIsSettingsExpanded] = useState(location.pathname.startsWith('/settings'))

    // Sync settings expansion with URL changes
    useEffect(() => {
        if (location.pathname.startsWith('/settings')) {
            setIsSettingsExpanded(true)
        }
    }, [location.pathname])

    useEffect(() => {
        // Initial fetch
        window.electronAPI.getPendingOutboxCount().then(setPendingCount)

        // Listen for updates
        const unsubscribe = window.electronAPI.onOutboxUpdate((data) => {
            setPendingCount(data.pendingCount)
        })

        return () => unsubscribe()
    }, [])

    return (
        <div className="app-layout">
            {/* Mobile Header (Branding & Status Only) */}
            <header className="mobile-header">
                <div style={{ width: '40px' }} /> {/* Spacer */}
                <h1 className="logo-small">Prism Invoice</h1>
                <div className={`network-status ${isOnline ? 'online' : 'offline'}`} style={{ width: '40px', justifyContent: 'center' }}>
                    <span className="status-dot"></span>
                </div>
            </header>

            {/* Desktop Sidebar (Hidden on Mobile) */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h1 className="logo">Prism Invoice</h1>
                </div>

                <nav className="sidebar-nav">
                    <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                        Invoices
                        {pendingCount > 0 && (
                            <span className="badge badge-scheduled" style={{ marginLeft: 'auto', padding: '2px 8px', fontSize: '0.75rem' }}>
                                {pendingCount}
                            </span>
                        )}
                    </NavLink>

                    <NavLink to="/clients" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        Clients
                    </NavLink>
                    
                    <NavLink to="/reports" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                        Reports
                    </NavLink>

                    <div className="nav-group">
                        <NavLink 
                            to="/settings/seller" 
                            className={({ isActive }) => `nav-link ${isActive || location.pathname.startsWith('/settings') ? 'active' : ''}`}
                            onClick={() => {
                                // If already in settings, just toggle
                                if (location.pathname.startsWith('/settings')) {
                                    setIsSettingsExpanded(!isSettingsExpanded)
                                } else {
                                    setIsSettingsExpanded(true)
                                }
                            }}
                        >
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                            Settings
                            <svg 
                                className="nav-icon" 
                                style={{ 
                                    marginLeft: 'auto', 
                                    width: '16px', 
                                    height: '16px', 
                                    transform: isSettingsExpanded ? 'rotate(90deg)' : 'none', 
                                    transition: 'transform 0.2s' 
                                }} 
                                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            >
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </NavLink>

                        {isSettingsExpanded && (
                            <div className="sub-nav" style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                <NavLink to="/settings/seller" className={({ isActive }) => `nav-link sub-nav-link ${isActive ? 'active' : ''}`} style={{ padding: '8px 12px', fontSize: '0.875rem' }}>
                                    <svg className="nav-icon" style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                                    Business Info
                                </NavLink>
                                <NavLink to="/settings/bank" className={({ isActive }) => `nav-link sub-nav-link ${isActive ? 'active' : ''}`} style={{ padding: '8px 12px', fontSize: '0.875rem' }}>
                                    <svg className="nav-icon" style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                                    Bank Details
                                </NavLink>
                                <NavLink to="/settings/signatures" className={({ isActive }) => `nav-link sub-nav-link ${isActive ? 'active' : ''}`} style={{ padding: '8px 12px', fontSize: '0.875rem' }}>
                                    <svg className="nav-icon" style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                    Signatures
                                </NavLink>
                                <NavLink to="/settings/email-templates" className={({ isActive }) => `nav-link sub-nav-link ${isActive ? 'active' : ''}`} style={{ padding: '8px 12px', fontSize: '0.875rem' }}>
                                    <svg className="nav-icon" style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                    Templates
                                </NavLink>
                                <NavLink to="/settings/google" className={({ isActive }) => `nav-link sub-nav-link ${isActive ? 'active' : ''}`} style={{ padding: '8px 12px', fontSize: '0.875rem' }}>
                                    <svg className="nav-icon" style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"/><path d="M12 8v4"/></svg>
                                    Google
                                </NavLink>
                            </div>
                        )}
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <div className={`network-status ${isOnline ? 'online' : 'offline'}`}>
                        <span className="status-dot"></span>
                        {isOnline ? 'Online' : 'Offline'}
                    </div>
                </div>
            </aside>

            {/* Mobile Bottom Navigation Bar */}
            <nav className="bottom-nav">
                <NavLink to="/" className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}>
                    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <span>Invoices</span>
                </NavLink>

                <NavLink to="/clients" className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}>
                    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>Clients</span>
                </NavLink>

                <NavLink to="/reports" className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}>
                    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    <span>Reports</span>
                </NavLink>

                <NavLink to="/settings" className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}>
                    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    <span>Settings</span>
                </NavLink>
            </nav>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    )
}
