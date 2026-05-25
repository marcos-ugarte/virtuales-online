import { useEffect, useRef } from 'react'
import BaseModal from '@/components/BaseModal'
import styles from './PrinterErrorModal.module.css'
import acceptButtonBg from '@/assets/svg/img_2_accept_button_background.svg'
import { getPrinterMode, PRINTER_DOWNLOAD_INFO } from '@/services/printer'

interface PrinterErrorModalProps {
  onAccept: () => void
  scale?: number
  visible?: boolean
  autoDismissMs?: number
}

export default function PrinterErrorModal({ onAccept, scale = 1, visible = true, autoDismissMs = 3000 }: PrinterErrorModalProps) {
  const onAcceptRef = useRef(onAccept)
  useEffect(() => { onAcceptRef.current = onAccept }, [onAccept])

  // Auto-dismiss timer — depends only on `visible` so parent re-renders
  // don't keep resetting the timer (onAccept is captured via ref).
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => onAcceptRef.current(), autoDismissMs)
    return () => clearTimeout(timer)
  }, [visible, autoDismissMs])

  const mode = getPrinterMode()
  const info = PRINTER_DOWNLOAD_INFO[mode]

  return (
    <BaseModal title="Error de impresión" scale={scale} height={537} visible={visible}>
      <p className={styles.contentText}>
        Error de impresión: ¡El servidor no está disponible!
      </p>
      <p className={styles.contentText}>
        Es posible que el controlador de impresora aún no esté instalado.
        Si es así, descargue el controlador de la impresora desde el siguiente enlace:
      </p>
      <p className={styles.downloadLink}>
        {info.url !== '#' ? (
          <a href={info.url} target="_blank" rel="noopener noreferrer">{info.name}</a>
        ) : (
          <span>{info.name}</span>
        )}
      </p>
      <p className={styles.contentText}>
        e inícielo.
      </p>
      <div className={styles.buttonContainer}>
        <button className={styles.okButton} onClick={() => onAcceptRef.current()}>
          <img src={acceptButtonBg} alt="" className={styles.buttonBg} />
          <span className={styles.buttonText}>OK</span>
        </button>
      </div>
    </BaseModal>
  )
}
