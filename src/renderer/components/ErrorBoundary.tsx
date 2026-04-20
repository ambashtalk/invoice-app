import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="empty-state" style={{ height: '100vh', justifyContent: 'center' }}>
          <div className="card" style={{ maxWidth: '500px', textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⚠️</div>
            <h1 className="page-title">Something went wrong</h1>
            <p className="page-subtitle" style={{ marginBottom: '24px' }}>
              The application encountered an unexpected error.
            </p>
            <div style={{ 
              background: 'rgba(0,0,0,0.2)', 
              padding: '12px', 
              borderRadius: '8px', 
              fontSize: '0.8rem', 
              fontFamily: 'monospace',
              marginBottom: '24px',
              textAlign: 'left',
              color: 'var(--color-error)',
              overflowX: 'auto'
            }}>
              {this.state.error?.message}
            </div>
            <button 
              className="btn btn-primary" 
              onClick={() => window.location.reload()}
              style={{ width: '100%' }}
            >
              Reload Application
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
