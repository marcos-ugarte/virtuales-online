import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: string
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message }
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#1a1a2e',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
          zIndex: 99999
        }}>
          <div style={{
            background: '#A5120D',
            padding: '16px 40px',
            borderRadius: '4px',
            marginBottom: '24px',
            fontSize: '24px',
            fontWeight: 700
          }}>
            Error del sistema
          </div>
          <p style={{ fontSize: '18px', marginBottom: '8px', opacity: 0.8 }}>
            Se ha producido un error inesperado.
          </p>
          <p style={{ fontSize: '14px', marginBottom: '32px', opacity: 0.5, maxWidth: '500px', textAlign: 'center', wordBreak: 'break-all' }}>
            {this.state.error}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#2E7D32',
              color: '#fff',
              border: 'none',
              padding: '14px 40px',
              fontSize: '18px',
              fontWeight: 700,
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            RECARGAR
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
