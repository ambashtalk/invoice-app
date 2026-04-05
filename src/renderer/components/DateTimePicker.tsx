import { FC, useState, useRef, useEffect } from 'react'
import { 
    format, 
    addMonths, 
    subMonths, 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    eachDayOfInterval, 
    isSameMonth, 
    isSameDay, 
    isToday, 
    parseISO, 
    isValid,
    set,
    getHours,
    getMinutes,
    isBefore,
    startOfDay
} from 'date-fns'

interface DateTimePickerProps {
    label?: string
    value: string // ISO string
    onChange: (value: string) => void
    disabled?: boolean
    noMargin?: boolean
}

export const DateTimePicker: FC<DateTimePickerProps> = ({ 
    label, 
    value, 
    onChange, 
    disabled = false,
    noMargin = false
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const [viewDate, setViewDate] = useState(new Date()) // The month we are looking at
    const containerRef = useRef<HTMLDivElement>(null)

    // Parse the current value
    const selectedDate = value && isValid(parseISO(value)) ? parseISO(value) : new Date()
    const isPastDateTime = isBefore(selectedDate, new Date())

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handlePrevMonth = (e: React.MouseEvent) => {
        e.stopPropagation()
        setViewDate(prev => subMonths(prev, 1))
    }

    const handleNextMonth = (e: React.MouseEvent) => {
        e.stopPropagation()
        setViewDate(prev => addMonths(prev, 1))
    }

    const handleDateSelect = (date: Date) => {
        // Keep current time when selecting a new date
        const newValue = set(date, {
            hours: getHours(selectedDate),
            minutes: getMinutes(selectedDate)
        })
        onChange(format(newValue, "yyyy-MM-dd'T'HH:mm"))
    }

    const handleTimeChange = (type: 'hours' | 'minutes', val: string) => {
        const num = Math.max(0, Math.min(type === 'hours' ? 23 : 59, parseInt(val) || 0))
        const newValue = set(selectedDate, { [type]: num })
        onChange(format(newValue, "yyyy-MM-dd'T'HH:mm"))
    }

    const setNow = () => {
        const now = new Date()
        onChange(format(now, "yyyy-MM-dd'T'HH:mm"))
        setViewDate(now)
    }

    // Generate days for the current view month
    const start = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start, end })

    const formattedValue = value ? format(selectedDate, 'MMM d, yyyy HH:mm') : 'Select date & time...'

    return (
        <div className={noMargin ? '' : 'form-group'} style={{ width: '100%', position: 'relative' }}>
            {label && <label className="form-label">{label}</label>}
            <div ref={containerRef} className="custom-dropdown-container">
                <div 
                    className={`form-input custom-dropdown-trigger ${disabled ? 'disabled' : ''} ${isOpen ? 'active' : ''}`}
                    onClick={(e) => {
                        if (disabled) return
                        e.stopPropagation()
                        setIsOpen(!isOpen)
                        if (!isOpen) setViewDate(selectedDate)
                    }}
                    style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        cursor: disabled ? 'default' : 'pointer'
                    }}
                >
                    <span style={{ fontSize: '0.9rem' }}>{formattedValue}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                </div>

                {isOpen && (
                    <div className="custom-dropdown-panel slide-up" style={{ width: '340px', padding: '20px', userSelect: 'none', maxHeight: 'none', overflow: 'visible' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <button type="button" className="btn btn-ghost btn-sm btn-icon" style={{ width: '32px', height: '32px' }} onClick={handlePrevMonth}>&lt;</button>
                            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--color-text-primary)' }}>{format(viewDate, 'MMMM yyyy')}</div>
                            <button type="button" className="btn btn-ghost btn-sm btn-icon" style={{ width: '32px', height: '32px' }} onClick={handleNextMonth}>&gt;</button>
                        </div>

                        {/* Day Names */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                                <div key={i} style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>{d}</div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                            {days.map((day, i) => {
                                const isCurrentMonth = isSameMonth(day, viewDate)
                                const isSelected = isSameDay(day, selectedDate)
                                const isTodayDate = isToday(day)
                                const isPastDay = isBefore(startOfDay(day), startOfDay(new Date()))
                                
                                return (
                                    <div 
                                        key={i}
                                        onClick={() => !isPastDay && handleDateSelect(day)}
                                        style={{
                                            height: '32px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.85rem',
                                            borderRadius: '6px',
                                            cursor: isPastDay ? 'default' : 'pointer',
                                            background: isSelected ? 'var(--color-accent)' : 'transparent',
                                            color: isSelected ? 'white' : (isPastDay ? 'rgba(255,255,255,0.05)' : (isCurrentMonth ? 'var(--color-text-primary)' : 'rgba(255,255,255,0.15)')),
                                            border: isTodayDate && !isSelected ? '1px solid var(--color-accent)' : 'none',
                                            fontWeight: isSelected || isTodayDate ? 600 : 400,
                                            pointerEvents: isPastDay ? 'none' : 'auto'
                                        }}
                                        className={isPastDay ? '' : `calendar-day-cell ${isSelected ? 'selected' : ''}`}
                                    >
                                        {format(day, 'd')}
                                    </div>
                                )
                            })}
                        </div>

                        {/* Time Picker Section */}
                        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>SET TIME (24H)</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input 
                                        type="number" 
                                        value={getHours(selectedDate).toString().padStart(2, '0')}
                                        onChange={(e) => handleTimeChange('hours', e.target.value)}
                                        style={{ width: '45px', textAlign: 'center', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'white', padding: '6px', fontSize: '0.9rem' }}
                                    />
                                    <span style={{ fontWeight: 600 }}>:</span>
                                    <input 
                                        type="number" 
                                        value={getMinutes(selectedDate).toString().padStart(2, '0')}
                                        onChange={(e) => handleTimeChange('minutes', e.target.value)}
                                        style={{ width: '45px', textAlign: 'center', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'white', padding: '6px', fontSize: '0.9rem' }}
                                    />
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={setNow} style={{ fontSize: '0.8rem', flex: 1 }}>Now</button>
                                <button 
                                    type="button" 
                                    className="btn btn-primary btn-sm" 
                                    onClick={() => !isPastDateTime && setIsOpen(false)} 
                                    style={{ 
                                        fontSize: '0.8rem', 
                                        flex: 2,
                                        opacity: isPastDateTime ? 0.5 : 1,
                                        cursor: isPastDateTime ? 'not-allowed' : 'pointer'
                                    }}
                                    disabled={isPastDateTime}
                                >
                                    {isPastDateTime ? 'Invalid Time' : 'Done'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .calendar-day-cell:hover {
                    background: rgba(255, 255, 255, 0.05) !important;
                }
                .calendar-day-cell.selected:hover {
                    background: var(--color-accent-dark, #4f46e5) !important;
                    filter: brightness(1.1);
                }
                .active {
                    border-color: var(--color-accent) !important;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2) !important;
                }
            `}</style>
        </div>
    )
}
