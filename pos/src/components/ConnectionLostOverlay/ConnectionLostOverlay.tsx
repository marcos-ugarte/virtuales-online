import styles from './ConnectionLostOverlay.module.css'

export type ServiceType = 'signalr' | 'relay'

interface ConnectionLostOverlayProps {
  visible?: boolean
  isReconnecting?: boolean
  service?: ServiceType
}

// Service display names
const SERVICE_NAMES: Record<ServiceType, string> = {
  signalr: 'Servidor Principal (SignalR)',
  relay: 'Servidor de Carreras (Relay)'
}

// Service descriptions
const SERVICE_DESCRIPTIONS: Record<ServiceType, { disconnected: string; reconnecting: string }> = {
  signalr: {
    disconnected: 'No hay comunicación con el servidor de operaciones',
    reconnecting: 'Intentando restablecer conexión con el servidor de operaciones'
  },
  relay: {
    disconnected: 'No hay comunicación con el servidor de datos de carreras',
    reconnecting: 'Intentando restablecer conexión con el servidor de datos de carreras'
  }
}

export default function ConnectionLostOverlay({
  visible = true,
  isReconnecting = false,
  service = 'signalr'
}: ConnectionLostOverlayProps) {
  if (!visible) return null

  const serviceName = SERVICE_NAMES[service]
  const description = isReconnecting
    ? SERVICE_DESCRIPTIONS[service].reconnecting
    : SERVICE_DESCRIPTIONS[service].disconnected

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <div className={`${styles.icon} ${isReconnecting ? styles.iconReconnecting : ''}`}>
          {isReconnecting ? '⟳' : '⚠'}
        </div>
        <span className={styles.title}>
          {isReconnecting ? 'RECONECTANDO...' : 'CONEXIÓN PERDIDA'}
        </span>
        <span className={styles.serviceName}>
          {serviceName}
        </span>
        <span className={styles.subtitle}>
          {description}
        </span>
        <span className={styles.warning}>
          Las apuestas están deshabilitadas
        </span>
      </div>
    </div>
  )
}
