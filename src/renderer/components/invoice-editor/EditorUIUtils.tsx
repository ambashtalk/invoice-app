export const FormSkeleton = ({ isMobile }: { isMobile: boolean }) => (
    <div style={{ paddingBottom: '32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
            <div className="skeleton" style={{ height: '70px', borderRadius: '8px' }} />
            <div className="skeleton" style={{ height: '70px', borderRadius: '8px' }} />
            <div className="skeleton" style={{ height: '70px', borderRadius: '8px' }} />
            {!isMobile && <div />}
        </div>
        <div className="card" style={{ marginBottom: '32px' }}>
            <div className="skeleton" style={{ height: '28px', width: '120px', marginBottom: '24px', borderRadius: '4px' }} />
            <div className="skeleton" style={{ height: '160px', borderRadius: '8px' }} />
        </div>
        <div className="card">
            <div className="skeleton" style={{ height: '28px', width: '100px', marginBottom: '16px', borderRadius: '4px' }} />
            <div className="skeleton" style={{ height: '60px', width: '60%', borderRadius: '4px' }} />
        </div>
    </div>
)

export const ReadOnlyField = ({ label, value, alignRight = false }: { label?: string, value: string, alignRight?: boolean }) => (
    <div style={{ 
        display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center',
        minHeight: '42px', textAlign: alignRight ? 'right' : 'left'
    }}>
        {label && <label className="form-label" style={{ marginBottom: '4px', display: 'block' }}>{label}</label>}
        <div style={{ fontWeight: 500, fontSize: '0.9375rem', color: 'var(--color-text-primary)', padding: 'var(--spacing-xs) 0' }}>
            {value || '-'}
        </div>
    </div>
)
