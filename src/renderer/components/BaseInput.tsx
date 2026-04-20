import { FC, InputHTMLAttributes } from 'react'

interface BaseInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    label?: string
    onChange?: (value: string) => void
    error?: string
    noMargin?: boolean
}

export const BaseInput: FC<BaseInputProps> = ({ label, onChange, type = 'text', className = '', error, noMargin = false, ...props }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (onChange) onChange(e.target.value)
    }

    const inputClasses = `form-input ${type === 'number' ? 'num-no-spinner' : ''} ${error ? 'border-error' : ''} ${className}`.trim()

    return (
        <div className={noMargin ? '' : 'form-group'} style={{ width: '100%' }}>
            {label && <label className="form-label">{label}</label>}
            <input 
                type={type} 
                className={inputClasses}
                onChange={handleChange}
                {...props}
            />
            {error && <p style={{ color: 'var(--color-error)', fontSize: '11px', marginTop: '4px' }}>{error}</p>}
        </div>
    )
}
