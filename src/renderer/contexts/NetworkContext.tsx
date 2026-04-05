import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface NetworkContextType {
    isOnline: boolean
    lastOnlineAt: Date | null
}

const NetworkContext = createContext<NetworkContextType>({
    isOnline: true,
    lastOnlineAt: null
})

export function NetworkProvider({ children }: { children: ReactNode }) {
    const [isOnline, setIsOnline] = useState(navigator.onLine)
    const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(
        navigator.onLine ? new Date() : null
    )

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true)
            setLastOnlineAt(new Date())
        }

        const handleOffline = () => {
            setIsOnline(false)
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    return (
        <NetworkContext.Provider value={{ isOnline, lastOnlineAt }}>
            {children}
        </NetworkContext.Provider>
    )
}

export function useNetwork() {
    return useContext(NetworkContext)
}
