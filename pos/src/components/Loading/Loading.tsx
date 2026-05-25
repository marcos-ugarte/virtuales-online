import styles from './Loading.module.css'

interface LoadingProps {
  type?: 'spinner' | 'dots'
  text?: string
  fullScreen?: boolean
  overlay?: boolean
}

export default function Loading({ type = 'spinner', text, fullScreen = false, overlay = false }: LoadingProps) {
  const wrapperClass = `${styles.loadingWrapper} ${fullScreen ? styles.fullScreen : ''} ${overlay ? styles.overlay : ''}`

  return (
    <div className={wrapperClass}>
      {type === 'spinner' ? (
        <div className={styles.loader} />
      ) : (
        <div className={styles.dotLoader} />
      )}
      {text && <div className={styles.loadingText}>{text}</div>}
    </div>
  )
}
