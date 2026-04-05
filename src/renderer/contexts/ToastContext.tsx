import { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { createPortal } from 'react-dom'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastAction {
    label: string
    onClick: () => void
}

interface Toast {
    id: string
    message: string
    type: ToastType
    action?: ToastAction
    duration?: number
    showProgress?: boolean
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, options?: { action?: ToastAction, duration?: number, showProgress?: boolean, id?: string }) => string
    success: (message: string) => void
    error: (message: string, duration?: number) => void
    info: (message: string) => void
    warning: (message: string, action?: ToastAction, duration?: number) => string
    removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    const showToast = useCallback((message: string, type: ToastType = 'info', options: { action?: ToastAction, duration?: number, showProgress?: boolean, id?: string } = {}) => {
        const id = options.id || Math.random().toString(36).substring(2, 9)
        const duration = options.duration || (type === 'warning' ? 10000 : 5000)
        
        // If updating an existing toast by ID
        setToasts(prev => {
            const filtered = prev.filter(t => t.id !== id)
            return [...filtered, { id, message, type, action: options.action, duration, showProgress: options.showProgress }]
        })
        
        if (duration !== Infinity) {
            setTimeout(() => removeToast(id), duration)
        }
        return id
    }, [removeToast])

    const success = useCallback((message: string) => showToast(message, 'success'), [showToast])
    const error = useCallback((message: string, duration?: number) => showToast(message, 'error', { duration }), [showToast])
    const info = useCallback((message: string) => showToast(message, 'info'), [showToast])
    const warning = useCallback((message: string, action?: ToastAction, duration?: number) => 
        showToast(message, 'warning', { action, duration, showProgress: true }), [showToast])

    return (
        <ToastContext.Provider value={{ showToast, success, error, info, warning, removeToast }}>
            {children}
            {createPortal(
                <div className="toast-container">
                    {toasts.map(toast => (
                        <div key={toast.id} className={`toast toast-${toast.type} slide-in-right`}>
                            <div className="toast-content">
                                <span className="toast-message">{toast.message}</span>
                                {toast.action && (
                                    <button 
                                        className="toast-action-btn"
                                        onClick={() => {
                                            toast.action?.onClick()
                                            removeToast(toast.id)
                                        }}
                                    >
                                        {toast.action.label}
                                    </button>
                                )}
                            </div>
                            <button onClick={() => removeToast(toast.id)} className="toast-close">×</button>
                            {toast.duration && toast.duration !== Infinity && toast.showProgress && (
                                <div 
                                    className="toast-progress" 
                                    style={{ animationDuration: `${toast.duration}ms` }} 
                                />
                            )}
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    )
}

export function useToast() {
    const context = useContext(ToastContext)
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}
