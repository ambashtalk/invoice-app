import { useState, useEffect } from 'react'

export interface ConflictResolverProps {
    title?: string
    localData: Record<string, any>
    remoteData: Record<string, any>
    onResolve: (resolvedData: any) => void
    ignoredKeys?: string[]
}

function formatValue(val: any): string {
    if (val === null || val === undefined) return 'Empty'
    if (typeof val === 'object') return JSON.stringify(val)
    if (typeof val === 'boolean') return val ? 'True' : 'False'
    return String(val)
}

export function ConflictResolver({ title = 'Sync Conflict Detected', localData, remoteData, onResolve, ignoredKeys = ['updated_at', 'last_synced_at', 'uuid', 'created_at', 'has_conflict', 'conflict_data'] }: ConflictResolverProps) {
    const [selections, setSelections] = useState<Record<string, 'local' | 'remote'>>({})
    const [conflictingKeys, setConflictingKeys] = useState<string[]>([])

    useEffect(() => {
        // Compute conflicting keys
        const keys = new Set([...Object.keys(localData), ...Object.keys(remoteData)])
        const conflicts: string[] = []
        const initialSelections: Record<string, 'local' | 'remote'> = {}

        keys.forEach(key => {
            if (ignoredKeys.includes(key)) return
            
            const localVal = JSON.stringify(localData[key])
            const remoteVal = JSON.stringify(remoteData[key])

            if (localVal !== remoteVal) {
                conflicts.push(key)
                initialSelections[key] = 'remote' // Default to incoming
            }
        })

        setConflictingKeys(conflicts)
        setSelections(initialSelections)
    }, [localData, remoteData])

    function handleSelect(key: string, source: 'local' | 'remote') {
        setSelections(prev => ({ ...prev, [key]: source }))
    }

    function handleKeepAll(source: 'local' | 'remote') {
        const newSelections: Record<string, 'local' | 'remote'> = {}
        conflictingKeys.forEach(k => newSelections[k] = source)
        setSelections(newSelections)
    }

    function handleSubmit() {
        // Reconstruct resolved object, prioritizing localData as the base
        const resolved = { ...localData }
        
        // Merge in remoteData for non-conflicting fields missing in local
        Object.keys(remoteData).forEach(k => {
            if (!(k in resolved)) resolved[k] = remoteData[k]
        })

        // Apply selected resolutions
        conflictingKeys.forEach(key => {
            if (selections[key] === 'remote') {
                resolved[key] = remoteData[key]
            } else {
                resolved[key] = localData[key]
            }
        })

        onResolve(resolved)
    }

    if (conflictingKeys.length === 0) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
                <h3>No semantic conflicts detected</h3>
                <p>Data matches safely. You can resolve instantly.</p>
                <button onClick={() => { handleKeepAll('local'); handleSubmit(); }} className="btn btn-primary" style={{ marginTop: 'var(--spacing-md)' }}>
                    Auto-Resolve
                </button>
            </div>
        )
    }

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 'var(--spacing-lg)' }}>
            <div className="card" style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-layer-1)', overflow: 'hidden' }}>
                <div style={{ paddingBottom: 'var(--spacing-lg)', borderBottom: '1px solid var(--border-color)', marginBottom: 'var(--spacing-md)' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--color-error)' }}>
                        ⚠️ {title}
                    </h2>
                    <p className="card-meta" style={{ marginTop: '8px', marginBottom: 0 }}>
                        This record was edited on another device since your last sync. Please select which version to keep for each conflicting field.
                    </p>
                </div>

                <div style={{ overflowY: 'auto', flex: 1, paddingRight: 'var(--spacing-sm)' }}>
                    {conflictingKeys.map(key => (
                        <div key={key} style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--bg-layer-2)', borderRadius: '8px' }}>
                            <div style={{ fontWeight: 600, marginBottom: 'var(--spacing-sm)', textTransform: 'capitalize' }}>
                                {key.replace(/_/g, ' ')}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                {/* Local Option */}
                                <div 
                                    onClick={() => handleSelect(key, 'local')}
                                    style={{ 
                                        padding: 'var(--spacing-sm)', 
                                        borderRadius: '6px',
                                        border: `2px solid ${selections[key] === 'local' ? 'var(--color-primary)' : 'transparent'}`,
                                        background: selections[key] === 'local' ? 'var(--bg-layer-1)' : 'var(--bg-layer-3)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-meta)', marginBottom: '4px', textTransform: 'uppercase' }}>This Device (Local)</div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', wordBreak: 'break-all' }}>
                                        {formatValue(localData[key])}
                                    </div>
                                </div>

                                {/* Remote Option */}
                                <div 
                                    onClick={() => handleSelect(key, 'remote')}
                                    style={{ 
                                        padding: 'var(--spacing-sm)', 
                                        borderRadius: '6px',
                                        border: `2px solid ${selections[key] === 'remote' ? 'var(--color-primary)' : 'transparent'}`,
                                        background: selections[key] === 'remote' ? 'var(--bg-layer-1)' : 'var(--bg-layer-3)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-meta)', marginBottom: '4px', textTransform: 'uppercase' }}>Incoming (Google Drive)</div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', wordBreak: 'break-all' }}>
                                        {formatValue(remoteData[key])}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ paddingTop: 'var(--spacing-lg)', borderTop: '1px solid var(--border-color)', marginTop: 'var(--spacing-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                        <button onClick={() => handleKeepAll('local')} className="btn btn-ghost btn-sm">Keep All Local</button>
                        <button onClick={() => handleKeepAll('remote')} className="btn btn-ghost btn-sm">Keep All Incoming</button>
                    </div>
                    <button onClick={handleSubmit} className="btn btn-primary" style={{ padding: '8px 24px' }}>
                        Confirm Merge
                    </button>
                </div>
            </div>
        </div>
    )
}
