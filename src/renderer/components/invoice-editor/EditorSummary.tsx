import { FC } from 'react'
import { FormData } from './types'
import { numberToWords } from '../../../shared/utils/numbers-to-words'

interface EditorSummaryProps {
    formData: FormData
    totalAmount: number
    taxBreakdown: any
    isReadOnly: boolean
    isMobile: boolean
    onUpdate: (data: Partial<FormData>) => void
    formatCurrency: (amount: number) => string
}

export const EditorSummary: FC<EditorSummaryProps> = ({
    formData,
    totalAmount,
    taxBreakdown,
    isReadOnly,
    isMobile,
    onUpdate,
    formatCurrency
}) => {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: '32px' }}>
            <div className="card">
                <h3 className="h3" style={{ marginBottom: '16px' }}>Notes & Email Body</h3>
                <textarea
                    className="form-input"
                    style={{ minHeight: '120px', resize: 'vertical' }}
                    placeholder="Enter any additional notes or customized email content..."
                    value={formData.email_body || ''}
                    onChange={(e) => onUpdate({ email_body: e.target.value })}
                    disabled={isReadOnly}
                />
                <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    {formData.currency === 'INR' && (
                        <><strong>In Words:</strong> {numberToWords(totalAmount)}</>
                    )}
                </div>
            </div>

            <div className="card">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
                        <span>Subtotal (Net)</span>
                        <span>{formatCurrency(taxBreakdown.netTotal)}</span>
                    </div>
                    {taxBreakdown.taxGroups.map((group: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
                            <span>{group.label}</span>
                            <span>{formatCurrency(group.amount)}</span>
                        </div>
                    ))}
                    <div style={{ margin: '8px 0', borderTop: '1px solid var(--color-border)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.25rem' }}>
                        <span>Total</span>
                        <span style={{ color: 'var(--color-primary)' }}>{formatCurrency(totalAmount)}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
