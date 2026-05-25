import BaseModal from '@/components/BaseModal'
import styles from './NoBetsModal.module.css'

interface NoBetsModalProps {
  scale?: number
  visible?: boolean
}

export default function NoBetsModal({ scale = 1, visible = true }: NoBetsModalProps) {
  return (
    <BaseModal title="¡No más apuestas posibles!" scale={scale} transparentOverlay visible={visible}>
      <p className={styles.contentText}>
        No se pueden realizar más apuestas.
      </p>
      <p className={styles.contentText}>
        La ronda va a empezar pronto.
      </p>
    </BaseModal>
  )
}
