import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../contexts/ToastContext'
import { Invoice, Client, ListFilters } from './types'

export function useInvoiceList() {
    const navigate = useNavigate(); const { success, error, info } = useToast()
    const [invoices, setInvoices] = useState<Invoice[]>([]); const [clients, setClients] = useState<Map<string, Client>>(new Map())
    const [loading, setLoading] = useState(true); const [isRefreshing, setIsRefreshing] = useState(false)
    const STORAGE_KEY = 'automate_invoice_filters'

    const initialFilters = useMemo(() => {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) try { return JSON.parse(saved) } catch (e) {}
        return { search: '', statuses: ['DRAFT', 'SCHEDULED', 'SENT', 'PAID', 'CANCELLED'], clientIds: [], min: '', max: '', sortKey: 'created_at', sortOrder: 'desc' }
    }, [])

    const [filters, setFilters] = useState<ListFilters>(initialFilters)
    useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(filters)) }, [filters])
    useEffect(() => { loadData() }, [])

    async function loadData(showLoading = true) {
        if (showLoading) setLoading(true); try {
            const [invs, cls] = await Promise.all([window.electronAPI.getInvoices(), window.electronAPI.getClients()])
            setInvoices(invs); setClients(new Map(cls.map((c: any) => [c.uuid, c])))
        } catch (err) { error('Failed to load') } finally { setLoading(false) }
    }

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const matchesSearch = inv.invoice_no.toLowerCase().includes(filters.search.toLowerCase()) || 
                                (inv.client_id && clients.get(inv.client_id)?.name.toLowerCase().includes(filters.search.toLowerCase()))
            const matchesStatus = filters.statuses.includes(inv.status)
            const matchesClient = filters.clientIds.length === 0 || (inv.client_id && filters.clientIds.includes(inv.client_id))
            const amount = inv.total_amount
            const matchesMin = !filters.min || amount >= Number(filters.min)
            const matchesMax = !filters.max || amount <= Number(filters.max)
            return matchesSearch && matchesStatus && matchesClient && matchesMin && matchesMax
        }).sort((a, b) => {
            if (!filters.sortOrder) return 0
            let valA: any = a[filters.sortKey as keyof Invoice]
            let valB: any = b[filters.sortKey as keyof Invoice]
            if (filters.sortKey === 'client_name') {
                valA = a.client_id ? (clients.get(a.client_id)?.name || '') : ''; valB = b.client_id ? (clients.get(b.client_id)?.name || '') : ''
            }
            if (valA < valB) return filters.sortOrder === 'asc' ? -1 : 1
            if (valA > valB) return filters.sortOrder === 'asc' ? 1 : -1
            return 0
        })
    }, [invoices, filters, clients])

    const handleSync = async () => { setIsRefreshing(true); try { await window.electronAPI.syncToDrive(); success('Sync complete'); loadData(false) } catch (err) { error('Sync failed') } finally { setIsRefreshing(false) } }

    return { loading, invoices, clients, filters, setFilters, filteredInvoices, isRefreshing, handleSync, loadData, navigate, success, error, info }
}
