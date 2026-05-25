import BaseModal from '@/components/BaseModal'
import styles from './ForceDisconnectModal.module.css'
import acceptButtonBg from '@/assets/svg/img_2_accept_button_background.svg'

interface ForceDisconnectModalProps {
  message: string
  scale?: number
  onClose: () => void
}

export default function ForceDisconnectModal({
  message,
  scale = 1,
  onClose
}: ForceDisconnectModalProps) {
  return (
    <BaseModal title="Sesión Cerrada" scale={scale} childImageCount={1}>
      {(onImageLoad: () => void) => (
        <>
          <p className={styles.contentText}>
            {message}
          </p>
          <p className={styles.infoText}>
            Su sesión ha sido terminada. Será redirigido a la pantalla de inicio.
          </p>
          <div className={styles.buttonContainer}>
            <button className={styles.okButton} onClick={onClose}>
              <img src={acceptButtonBg} alt="" className={styles.buttonBg} onLoad={onImageLoad} />
              <span className={styles.buttonText}>OK</span>
            </button>
          </div>
        </>
      )}
    </BaseModal>
  )
}
