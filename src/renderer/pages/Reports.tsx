import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'

interface ReportItem {
    month: string
    clientName: string
    total_including_tax: number
}

export default function Reports() {
    const navigate = useNavigate()
    const { error } = useToast()
    const [data, setData] = useState<ReportItem[]>([])
    const [loading, setLoading] = useState(true)
    const [totalRevenue, setTotalRevenue] = useState(0)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        try {
            const result = await window.electronAPI.getReceivedByMonth()
            setData(result)
            
            const total = result.reduce((acc: number, item: any) => acc + item.total_including_tax, 0)
            setTotalRevenue(total)
        } catch (err: any) {
            console.error('Failed to load reports:', err)
            error(`Failed to load reports: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    function formatCurrency(amount: number) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount)
    }

    const groupedData = data.reduce((acc: Record<string, ReportItem[]>, item: ReportItem) => {
        if (!acc[item.month]) acc[item.month] = []
        acc[item.month].push(item)
        return acc
    }, {} as Record<string, ReportItem[]>)

    const months = Object.keys(groupedData).sort((a, b) => b.localeCompare(a))

    if (loading) return <div className="empty-state"><p>Loading reports...</p></div>

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 className="page-title">Monthly Revenue Reports</h1>
                    <p className="page-subtitle">Track payments received across all clients</p>
                </div>
                <button onClick={() => navigate('/')} className="btn btn-ghost">← Back</button>
            </div>

            <div className="card" style={{ marginBottom: '32px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-accent)' }}>
                <div className="card-meta">Total Revenue Received (Lifetime)</div>
                <div className="amount amount-large" style={{ color: 'var(--color-accent)', marginTop: '8px' }}>
                    {formatCurrency(totalRevenue)}
                </div>
            </div>

            {months.length === 0 ? (
                <div className="empty-state">
                    <p>No revenue data found. Only 'PAID' invoices are included in reports.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {months.map(month => {
                        const monthTotal = groupedData[month].reduce((sum: number, item: ReportItem) => sum + item.total_including_tax, 0)
                        const [year, monthNum] = month.split('-')
                        const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })

                        return (
                            <div key={month} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                <div style={{ 
                                    padding: '16px 24px', 
                                    background: 'rgba(255,255,255,0.03)', 
                                    borderBottom: '1px solid var(--color-border)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <h3 style={{ margin: 0, color: 'var(--color-text-primary)' }}>{monthName}</h3>
                                    <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>{formatCurrency(monthTotal)}</span>
                                </div>
                                <table className="table" style={{ margin: 0 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ paddingLeft: '24px' }}>Client Name</th>
                                            <th style={{ textAlign: 'right', paddingRight: '24px' }}>Amount Received</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groupedData[month].map((item, idx) => (
                                            <tr key={idx}>
                                                <td style={{ paddingLeft: '24px' }}>{item.clientName}</td>
                                                <td style={{ textAlign: 'right', paddingRight: '24px', fontWeight: 500 }}>
                                                    {formatCurrency(item.total_including_tax)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
