import { useState, useEffect } from 'react'

export function useSettings() {
    const [profiles, setProfiles] = useState<any[]>([])
    const [signatures, setSignatures] = useState<any[]>([])
    const [emailTemplates, setEmailTemplates] = useState<any[]>([])
    const [sellerInfo, setSellerInfo] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [googleConnected, setGoogleConnected] = useState(false)
    const [hasCustomAuth, setHasCustomAuth] = useState(false)

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true); try {
            const [p, s, t, sel, gc, hc] = await Promise.all([
                window.electronAPI.getPaymentProfiles(), window.electronAPI.getSignatures(),
                window.electronAPI.getEmailTemplates(), window.electronAPI.getSellerInfo(),
                window.electronAPI.isGoogleConnected(), window.electronAPI.hasCustomCredentials()
            ])
            setProfiles(p); setSignatures(s); setEmailTemplates(t); setSellerInfo(sel); setGoogleConnected(gc); setHasCustomAuth(hc)
        } catch (err) { console.error(err) } finally { setLoading(false) }
    }

    return { profiles, signatures, emailTemplates, sellerInfo, loading, googleConnected, hasCustomAuth, loadData }
}
