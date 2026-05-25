import { type ReactNode } from 'react'
import styles from './BaseModal.module.css'
import headerBgImg from '@/assets/svg/img_0_img.svg'

interface BaseModalProps {
  title?: string
  children: ReactNode | ((onImageLoad: () => void) => ReactNode)
  scale?: number
  showHeader?: boolean
  height?: number
  transparentOverlay?: boolean
  /** Control visibility via CSS (no mount/unmount). Defaults to true. */
  visible?: boolean
  /** Custom header background SVG (overrides default red header) */
  headerBg?: string
  /** @deprecated No longer used — modal renders immediately */
  childImageCount?: number
  /** @deprecated No longer used — modal renders immediately */
  onChildImageLoad?: () => void
}

export default function BaseModal({
  title = 'Error',
  children,
  scale = 1,
  showHeader = true,
  height = 459,
  transparentOverlay = false,
  visible = true,
  headerBg,
}: BaseModalProps) {
  // No-op handler for children that call onImageLoad
  const noop = () => {}

  return (
    <div className={`${styles.overlay} ${transparentOverlay ? styles.overlayTransparent : ''} ${!visible ? styles.overlayHidden : ''}`}>
      <div
        className={styles.modal}
        style={{ '--modal-scale': scale, '--modal-height': `${height}px` } as React.CSSProperties}
      >
        {/* Modal Content - skewed container for parallelogram effect */}
        <div className={styles.modalContent}>
          {/* Modal Background */}
          <div className={styles.modalBackground} />

          {/* Header - counter-skewed to straighten the bar */}
          {showHeader && (
            <div className={styles.header}>
              <div className={styles.headerBackground}>
                <img src={headerBg || headerBgImg} alt="" />
              </div>
              <span className={styles.headerText}>{title}</span>
            </div>
          )}

          {/* Content */}
          <div className={styles.content}>
            {typeof children === 'function'
              ? (children as (onImageLoad: () => void) => ReactNode)(noop)
              : children}
          </div>
        </div>
      </div>
    </div>
  )
}
