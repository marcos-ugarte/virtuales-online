import styles from './DeviceLockOverlay.module.css'

interface DeviceLockOverlayProps {
  visible: boolean
  reason?: string
  lockedBy?: string
}

export default function DeviceLockOverlay({ visible, reason, lockedBy }: DeviceLockOverlayProps) {
  if (!visible) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.iconCircle}>
          <svg className={styles.lockIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2 className={styles.title}>DISPOSITIVO BLOQUEADO</h2>
        {reason && <p className={styles.reason}>{reason}</p>}
        {lockedBy && (
          <p className={styles.lockedBy}>Bloqueado por: {lockedBy}</p>
        )}
        <p className={styles.hint}>Contacte al administrador para desbloquear</p>
      </div>
    </div>
  )
}
