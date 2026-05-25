import { memo, useMemo, type ReactNode } from 'react'
import styles from './ScaleWrapper.module.css'

interface ScaleWrapperProps {
  children: ReactNode
  backgroundImage?: string
}

/**
 * Wrapper component that maintains a fixed aspect ratio (16:9)
 * and scales all content proportionally to fit any viewport size.
 * Content inside will shrink/grow uniformly instead of reflowing.
 */
function ScaleWrapper({ children, backgroundImage }: ScaleWrapperProps) {
  // Use CSS background-image instead of <img> to prevent blue flash
  // during heavy re-renders (CSS backgrounds are part of the paint layer)
  const viewportStyle = useMemo(() =>
    backgroundImage
      ? { backgroundImage: `url(${backgroundImage})` }
      : undefined,
    [backgroundImage]
  )

  return (
    <div className={styles.viewport} style={viewportStyle}>
      <div className={styles.scaleContainer}>
        {children}
      </div>
    </div>
  )
}

export default memo(ScaleWrapper)
