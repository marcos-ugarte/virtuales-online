import styles from './SessionErrorScreen.module.css'
import ScaleWrapper from '@/components/ScaleWrapper/ScaleWrapper'
import SessionErrorModal from '@/components/SessionErrorModal'

// Assets
import dsLogoImg from '@/assets/images/ds_logo_login.png'
import gamesImg from '@/assets/images/games_img.webp'

interface SessionErrorScreenProps {
  deviceId: string
}

export default function SessionErrorScreen({ deviceId }: SessionErrorScreenProps) {
  return (
    <ScaleWrapper>
      <div className={styles.container}>
        {/* Background Images (same as login) */}
        <div className={styles.gamesImgContainer}>
          <img className={styles.dsLogo} src={dsLogoImg} alt="DS Logo" />
          <img className={styles.gamesImg} src={gamesImg} alt="Games" />
        </div>

        {/* Dark Overlay */}
        <div className={styles.darkOverlay} />

        {/* Spinning Circles Animation */}
        <div className={styles.spinnerContainer}>
          <div className={styles.spinner}>
            <div className={styles.circle1} />
            <div className={styles.circle2} />
            <div className={styles.circle3} />
          </div>
        </div>

        {/* Session Error Modal */}
        <SessionErrorModal deviceId={deviceId} />

        {/* Version */}
        <div className={styles.version}>1.0.0</div>
      </div>
    </ScaleWrapper>
  )
}
