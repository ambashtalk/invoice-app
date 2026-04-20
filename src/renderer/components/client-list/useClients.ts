import { useState, useEffect } from 'react'

export function useClients() {
    const [clients, setClients] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const loadData = async () => {
        try {
            const data = await window.electronAPI.getClients()
            setClients(data)
        } catch (err) { console.error(err) } finally { setLoading(false) }
    }

    useEffect(() => { loadData() }, [])

    const deleteClient = async (id: string) => {
        if (confirm('Delete client?')) {
            await window.electronAPI.deleteClient(id)
            loadData()
        }
    }

    return { clients, loading, deleteClient, refresh: loadData }
}
