import { useMemo } from 'react'
import firstSecPlcSvgRaw from '@/assets/svg/bg_458_firstSecPlc.svg?raw'
import firstSecThirdPlcSvgRaw from '@/assets/svg/bg_460_firstSecThirdPlc.svg?raw'
import styles from './BetModeButtons.module.css'

type BetMode = 'exacta' | 'trifecta'

interface BetModeButtonsProps {
  mode: BetMode
  onModeChange: (mode: BetMode) => void
}

export function BetModeButtons({ mode, onModeChange }: BetModeButtonsProps) {
  // Process SVG content for exacta (1°2°)
  // Original POS: Numbers 34.92px fontWeight 600, Degree symbols 15.87px fontWeight 100
  // All text has transform: skewX(-10deg)
  // Layout is staggered diagonally: each row moves down and right
  // SVG viewBox: 138 x 100, Original button: 114.125 x 82.6875 (scale ~1.21)
  const exactaSvg = useMemo(() => {
    let svg = firstSecPlcSvgRaw
    svg = svg.replace(/<svg /, '<svg preserveAspectRatio="xMidYMid meet" ')

    // Staggered diagonal layout matching original POS
    // Original positions (scaled to SVG viewBox):
    // "1" at relLeft: 26, relTop: 15 -> y baseline at ~45
    // "2" at relLeft: 61, relTop: 36 -> y baseline at ~66
    const label = `
      <g transform="skewX(-10)" style="pointer-events:none">
        <text x="26" y="45" font-size="40" font-family="DIN Next LT Pro, Helvetica, sans-serif" font-weight="600" fill="#ffffff">1</text>
        <text x="52" y="32" font-size="18" font-family="DIN Next LT Pro, Helvetica, sans-serif" font-weight="100" fill="#ffffff">°</text>
        <text x="61" y="66" font-size="40" font-family="DIN Next LT Pro, Helvetica, sans-serif" font-weight="600" fill="#ffffff">2</text>
        <text x="87" y="53" font-size="18" font-family="DIN Next LT Pro, Helvetica, sans-serif" font-weight="100" fill="#ffffff">°</text>
      </g>
    `
    svg = svg.replace('</svg>', `${label}</svg>`)

    return svg
  }, [])

  // Process SVG content for trifecta (1°2°3°)
  // SVG viewBox: 177 x 100, Original button: 146.34 x 82.6875 (scale ~1.21)
  const trifectaSvg = useMemo(() => {
    let svg = firstSecThirdPlcSvgRaw
    svg = svg.replace(/<svg /, '<svg preserveAspectRatio="xMidYMid meet" ')

    // Staggered diagonal layout matching original POS
    // Original positions (scaled to SVG viewBox):
    // "1" at relLeft: 30, relTop: 8 -> y baseline at ~38
    // "2" at relLeft: 59, relTop: 27 -> y baseline at ~57
    // "3" at relLeft: 91, relTop: 46 -> y baseline at ~76
    const label = `
      <g transform="skewX(-10)" style="pointer-events:none">
        <text x="30" y="38" font-size="40" font-family="DIN Next LT Pro, Helvetica, sans-serif" font-weight="600" fill="#ffffff">1</text>
        <text x="56" y="25" font-size="18" font-family="DIN Next LT Pro, Helvetica, sans-serif" font-weight="100" fill="#ffffff">°</text>
        <text x="59" y="57" font-size="40" font-family="DIN Next LT Pro, Helvetica, sans-serif" font-weight="600" fill="#ffffff">2</text>
        <text x="85" y="44" font-size="18" font-family="DIN Next LT Pro, Helvetica, sans-serif" font-weight="100" fill="#ffffff">°</text>
        <text x="91" y="76" font-size="40" font-family="DIN Next LT Pro, Helvetica, sans-serif" font-weight="600" fill="#ffffff">3</text>
        <text x="117" y="63" font-size="18" font-family="DIN Next LT Pro, Helvetica, sans-serif" font-weight="100" fill="#ffffff">°</text>
      </g>
    `
    svg = svg.replace('</svg>', `${label}</svg>`)

    return svg
  }, [])

  return (
    <div className={styles.betModeButtons}>
      <button
        className={`${styles.betModeBtn} ${mode === 'exacta' ? styles.active : ''}`}
        onClick={() => onModeChange('exacta')}
        dangerouslySetInnerHTML={{ __html: exactaSvg }}
      />
      <button
        className={`${styles.betModeBtn} ${styles.trifectaBtn} ${mode === 'trifecta' ? styles.active : ''}`}
        onClick={() => onModeChange('trifecta')}
        dangerouslySetInnerHTML={{ __html: trifectaSvg }}
      />
    </div>
  )
}

export default BetModeButtons
