import { FC } from 'react'

interface BaseCheckboxProps {
    checked: boolean
    onChange?: (checked: boolean) => void
    disabled?: boolean
    label?: string
}

export const BaseCheckbox: FC<BaseCheckboxProps> = ({ checked, onChange, disabled, label }) => {
    return (
        <label 
            className={`custom-checkbox-wrapper ${disabled ? 'disabled' : ''}`}
            style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                cursor: disabled ? 'default' : 'pointer',
                opacity: disabled ? 0.6 : 1
            }}
            onClick={(e) => {
                if (disabled || !onChange) return
                e.preventDefault()
                onChange(!checked)
            }}
        >
            <div className={`custom-checkbox ${checked ? 'checked' : ''}`}>
                {checked && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                )}
            </div>
            {label && <span className="form-label" style={{ margin: 0 }}>{label}</span>}
        </label>
    )
}
