import { useEffect, useState, useRef } from 'react'
import styles from './LoginError.module.css'

interface LoginErrorProps {
  message: string
  visible: boolean
  duration?: number
  onHide?: () => void
}

export default function LoginError({ message, visible, duration = 3000, onHide }: LoginErrorProps) {
  const [isVisible, setIsVisible] = useState(false)
  const prevVisibleRef = useRef(visible)

  useEffect(() => {
    // Only update if visibility actually changed
    if (prevVisibleRef.current !== visible) {
      prevVisibleRef.current = visible
      if (visible) {
        setIsVisible(true)

        if (duration > 0) {
          const timer = setTimeout(() => {
            setIsVisible(false)
            onHide?.()
          }, duration)

          return () => clearTimeout(timer)
        }
      } else {
        setIsVisible(false)
      }
    }
  }, [visible, duration, onHide])

  return (
    <div className={`${styles.loginError} ${isVisible ? styles.visible : ''}`}>
      <div className={styles.loginErrorBg} />
      <span className={styles.loginErrorText}>{message}</span>
    </div>
  )
}
