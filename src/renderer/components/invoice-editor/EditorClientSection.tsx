import { FC } from 'react'
import { BaseDropdown } from '../BaseDropdown'
import { Client, Signature, FormData, TAX_RATES } from './types'

interface EditorClientSectionProps {
    formData: FormData
    clients: Client[]
    signatures: Signature[]
    isReadOnly: boolean
    isMobile: boolean
    onUpdate: (data: Partial<FormData>) => void
}

export const EditorClientSection: FC<EditorClientSectionProps> = ({
    formData,
    clients,
    signatures,
    isReadOnly,
    isMobile,
    onUpdate
}) => {
    return (
        <div className="card" style={{ marginBottom: '32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '16px' }}>
                <BaseDropdown
                    label="Client"
                    options={clients.map(c => ({ label: c.name, value: c.uuid }))}
                    selected={formData.client_id}
                    onChange={(v: any) => onUpdate({ client_id: v })}
                    disabled={isReadOnly}
                    noMargin
                />
                <BaseDropdown
                    label="Signature"
                    options={signatures.map(s => ({ label: s.name, value: s.id }))}
                    selected={formData.signature_id}
                    onChange={(v: any) => onUpdate({ signature_id: v })}
                    disabled={isReadOnly}
                    noMargin
                />
                <BaseDropdown
                    label="Currency"
                    options={[{ label: 'INR (₹)', value: 'INR' }, { label: 'USD ($)', value: 'USD' }, { label: 'EUR (€)', value: 'EUR' }]}
                    selected={formData.currency}
                    onChange={(v: any) => onUpdate({ currency: v })}
                    disabled={isReadOnly}
                    noMargin
                />
                <BaseDropdown
                    label="Standard Tax"
                    options={TAX_RATES.map(r => ({ label: r.label, value: String(r.value) }))}
                    selected={String(formData.tax_rate)}
                    onChange={(v: any) => {
                        const newRate = Number(v)
                        onUpdate({ 
                            tax_rate: newRate,
                            items: formData.items.map(item => ({ ...item, tax_rate: newRate }))
                        })
                    }}
                    disabled={isReadOnly}
                    noMargin
                />
            </div>
        </div>
    )
}
