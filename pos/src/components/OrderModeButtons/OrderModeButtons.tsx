import { useMemo, useCallback } from 'react'
import exactAnyButSvgRaw from '@/assets/svg/bg_461_exactAnyBut.svg?raw'
import styles from './OrderModeButtons.module.css'

type OrderMode = 'exact' | 'any'

interface OrderModeButtonsProps {
  mode: OrderMode
  onModeChange: (mode: OrderMode) => void
}

export function OrderModeButtons({ mode: _mode, onModeChange }: OrderModeButtonsProps) {
  // Process SVG content
  const svgContent = useMemo(() => {
    let svg = exactAnyButSvgRaw
    svg = svg.replace(/<svg /, '<svg preserveAspectRatio="xMidYMid meet" ')

    // Inject text labels for both buttons
    // Original POS font: "DIN Next LT Pro", weight 400, skewX(-10deg) italic effect
    // Top button (EN ORDEN) - centered around y=50 (top half of 0-100)
    const enOrdenLabel = `
      <g transform="skewX(-10)" style="pointer-events:none">
        <text x="135" y="40" text-anchor="middle" font-size="18" font-family="DIN Next LT Pro, Helvetica, sans-serif" font-weight="normal" fill="#ffffff">EN</text>
        <text x="135" y="65" text-anchor="middle" font-size="18" font-family="DIN Next LT Pro, Helvetica, sans-serif" font-weight="normal" fill="#ffffff">ORDEN</text>
      </g>
    `

    // Bottom button (CUALQUIER ORDEN) - centered around y=150 (bottom half of 100-203)
    const cualquierOrdenLabel = `
      <g transform="skewX(-10)" style="pointer-events:none">
        <text x="125" y="140" text-anchor="middle" font-size="18" font-family="DIN Next LT Pro, Helvetica, sans-serif" font-weight="normal" fill="#ffffff">CUALQUIER</text>
        <text x="125" y="165" text-anchor="middle" font-size="18" font-family="DIN Next LT Pro, Helvetica, sans-serif" font-weight="normal" fill="#ffffff">ORDEN</text>
      </g>
    `

    svg = svg.replace('</svg>', `${enOrdenLabel}${cualquierOrdenLabel}</svg>`)

    return svg
  }, [])

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickY = e.clientY - rect.top
    const height = rect.height

    // Top half = exact, bottom half = any
    // The divider is at ~50% of the SVG height
    if (clickY < height * 0.5) {
      onModeChange('exact')
    } else {
      onModeChange('any')
    }
  }, [onModeChange])

  return (
    <div className={styles.orderModeButtons}>
      <div
        className={styles.svgContainer}
        onClick={handleClick}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  )
}

export default OrderModeButtons
