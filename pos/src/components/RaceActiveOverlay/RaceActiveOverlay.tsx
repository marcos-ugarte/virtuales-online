import styles from './RaceActiveOverlay.module.css'

interface RaceActiveOverlayProps {
  visible?: boolean
  showTitle?: boolean
  isExiting?: boolean
  game?: string
}

export default function RaceActiveOverlay({ visible = true, showTitle = true, isExiting = false, game = 'dos' }: RaceActiveOverlayProps) {
  if (!visible) return null

  const isHorse = game === 'hoc'
  const spriteClass = isHorse ? styles.horseRunning : styles.dogRunning

  return (
    <div className={`${styles.overlay} ${isExiting ? styles.overlayExiting : ''}`}>
      {showTitle && <div className={spriteClass} />}
    </div>
  )
}
