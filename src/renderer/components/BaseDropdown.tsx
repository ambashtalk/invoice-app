import { FC, useState, useRef, useEffect } from 'react'
import { BaseCheckbox } from './BaseCheckbox'

interface Option {
    label: string
    value: string
}

interface BaseDropdownProps {
    label?: string
    options: Option[]
    selected: string | string[]
    onChange: (value: any) => void
    multi?: boolean
    placeholder?: string
    disabled?: boolean
    noMargin?: boolean
}

export const BaseDropdown: FC<BaseDropdownProps> = ({ 
    label, 
    options, 
    selected, 
    onChange, 
    multi = false, 
    placeholder = 'Select option...', 
    disabled = false,
    noMargin = false
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const toggleOption = (val: string) => {
        if (multi) {
            const currentSelected = Array.isArray(selected) ? selected : []
            if (currentSelected.includes(val)) {
                onChange(currentSelected.filter(v => v !== val))
            } else {
                onChange([...currentSelected, val])
            }
        } else {
            onChange(val)
            setIsOpen(false)
        }
    }

    const isSelected = (val: string) => {
        if (multi) {
            return Array.isArray(selected) && selected.includes(val)
        }
        return selected === val
    }

    const getDisplayLabel = () => {
        if (multi) {
            const currentSelected = Array.isArray(selected) ? selected : []
            if (currentSelected.length === 0) return placeholder
            if (currentSelected.length === options.length) return `All ${label === 'Status' ? 'Statuses' : label + 's'}`
            return `${currentSelected.length} ${label === 'Status' ? 'Statuses' : label + 's'}`
        } else {
            const option = options.find(o => o.value === selected)
            return option ? option.label : placeholder
        }
    }

    return (
        <div className={noMargin ? '' : 'form-group'} style={{ width: '100%' }}>
            {label && <label className="form-label">{label}</label>}
            <div ref={containerRef} className="custom-dropdown-container">
                <div 
                    className={`form-input custom-dropdown-trigger ${disabled ? 'disabled' : ''}`}
                    onClick={(e) => {
                        if (disabled) return
                        e.stopPropagation()
                        setIsOpen(!isOpen)
                    }}
                    style={{ 
                        opacity: disabled ? 0.6 : 1, 
                        cursor: disabled ? 'default' : 'pointer' 
                    }}
                >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {getDisplayLabel()}
                    </span>
                    <span style={{ fontSize: '10px', marginLeft: '8px' }}>{isOpen ? '▲' : '▼'}</span>
                </div>

                {isOpen && (
                    <div className="custom-dropdown-panel slide-up">
                        {multi && (
                            <>
                                <div 
                                    className="custom-dropdown-item"
                                    onClick={() => {
                                        const allValues = options.map(o => o.value)
                                        const currentSelected = Array.isArray(selected) ? selected : []
                                        onChange(currentSelected.length === options.length ? [] : allValues)
                                    }}
                                >
                                    <BaseCheckbox checked={Array.isArray(selected) && selected.length === options.length} />
                                    <span style={{ fontWeight: 600 }}>All</span>
                                </div>
                                <div style={{ borderBottom: '1px solid var(--color-border)', margin: '4px 0' }} />
                            </>
                        )}
                        {options.map(o => (
                            <div 
                                key={o.value} 
                                className={`custom-dropdown-item ${isSelected(o.value) ? 'selected' : ''}`}
                                onClick={() => toggleOption(o.value)}
                            >
                                {multi && <BaseCheckbox checked={isSelected(o.value)} />}
                                <span>{o.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
