import { useCallback, useMemo } from 'react'
import winnerButtonsSvgRaw from '@/assets/svg/bg_457_bg.svg?raw'
import styles from './WinnerButtons.module.css'

interface WinnerButtonsProps {
  leftLabel: string
  rightLabel: string
  onLeftClick?: () => void
  onRightClick?: () => void
  leftActive?: boolean
  rightActive?: boolean
}

export function WinnerButtons({
  leftLabel,
  rightLabel,
  onLeftClick,
  onRightClick,
  leftActive = false,
  rightActive = false
}: WinnerButtonsProps) {
  // Process SVG content to add interactivity
  const svgContent = useMemo(() => {
    let modifiedSvg = winnerButtonsSvgRaw

    // Ensure SVG scales properly
    modifiedSvg = modifiedSvg.replace(
      /<svg /,
      '<svg preserveAspectRatio="xMidYMid meet" '
    )

    // Make left button interactive (hlbutt_x5F_li)
    modifiedSvg = modifiedSvg.replace(
      /id="hlbutt_x5F_li"/g,
      'id="hlbutt_x5F_li" class="winner-btn winner-btn-left" style="cursor:pointer"'
    )

    // Make right button interactive (hlbutt_x5F_re)
    modifiedSvg = modifiedSvg.replace(
      /id="hlbutt_x5F_re"/g,
      'id="hlbutt_x5F_re" class="winner-btn winner-btn-right" style="cursor:pointer"'
    )

    return modifiedSvg
  }, [])

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as SVGElement

    // Find the closest group element with an ID we recognize
    let element: SVGElement | null = target

    while (element) {
      const id = element.id || element.getAttribute?.('id')
      const className = element.className?.baseVal || element.getAttribute?.('class') || ''

      if (id === 'hlbutt_x5F_li' || className.includes('winner-btn-left')) {
        onLeftClick?.()
        return
      }
      if (id === 'hlbutt_x5F_re' || className.includes('winner-btn-right')) {
        onRightClick?.()
        return
      }

      element = element.parentElement as SVGElement | null
    }
  }, [onLeftClick, onRightClick])

  return (
    <div className={styles.winnerButtons}>
      <div
        className={styles.svgContainer}
        onClick={handleClick}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
      {/* Text labels overlaid on the buttons */}
      <div className={styles.labelsContainer}>
        <span className={`${styles.label} ${styles.labelLeft} ${leftActive ? styles.labelActive : ''}`}>
          {leftLabel}
        </span>
        <span className={`${styles.label} ${styles.labelRight} ${rightActive ? styles.labelActive : ''}`}>
          {rightLabel}
        </span>
      </div>
    </div>
  )
}

export default WinnerButtons
