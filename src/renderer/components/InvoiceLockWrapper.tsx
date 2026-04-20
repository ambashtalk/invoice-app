import React, { useEffect, useState, useRef } from 'react'
import { useParams, Outlet } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'

export const InvoiceLockContext = React.createContext<{ remoteLockedBy: boolean }>({ remoteLockedBy: false })

export function useInvoiceLock() {
    return React.useContext(InvoiceLockContext)
}

export default function InvoiceLockWrapper() {
    const { id } = useParams()
    const { error } = useToast()
    const [remoteLockedBy, setRemoteLockedBy] = useState(false)
    const lockAcquiredRef = useRef(false)

    useEffect(() => {
        if (!id) return

        let isActive = true
        async function initLock() {
            setRemoteLockedBy(false)
            lockAcquiredRef.current = false
            
            try {
                const profile = await window.electronAPI.getGoogleProfile().catch(() => null)
                const uid = profile?.email || 'unknown-user'

                const lockStatus = await window.electronAPI.isInvoiceLocked(id!, uid).catch(() => ({ locked: false, byMe: false }))
                if (!isActive) return

                if (lockStatus.locked && !lockStatus.byMe) {
                    setRemoteLockedBy(true)
                    error('This invoice is currently being edited on another device.')
                } else {
                    await window.electronAPI.lockInvoice(id!, uid).catch(() => {})
                    if (isActive) {
                        lockAcquiredRef.current = true
                    }
                }
            } catch (err) {
                console.error('Failed to init lock', err)
            }
        }
        
        initLock()

        return () => {
            isActive = false
            if (lockAcquiredRef.current && id) {
                window.electronAPI.unlockInvoice(id).catch(() => {})
            }
        }
    }, [id])

    return (
        <InvoiceLockContext.Provider value={{ remoteLockedBy }}>
            <Outlet />
        </InvoiceLockContext.Provider>
    )
}
