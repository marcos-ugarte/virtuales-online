import { memo, useMemo, useRef, useState, useCallback, useEffect } from 'react'
import styles from './Cuotas.module.css'

// Import background images
import betsZoneBg from '@/assets/svg/BetsZone.svg'

// Import print button assets per game type
import printButtonBgDos from '@/assets/svg/bg_288_printButtBack_printIcoButt_stdShadow.svg'
import printButtonIconDos from '@/assets/svg/bg_289_printButtTxt_printTxtButt.svg'
import printButtonBgDoe from '@/assets/svg/bg_193_printButtBack_printIcoButt_stdShadow.svg'
import printButtonIconDoe from '@/assets/svg/bg_194_printButtTxt_printTxtButt.svg'

const BUTTON_ASSETS: Record<string, { bg: string; icon: string }> = {
  doe: { bg: printButtonBgDoe, icon: printButtonIconDoe },
  dos: { bg: printButtonBgDos, icon: printButtonIconDos },
  dot: { bg: printButtonBgDos, icon: printButtonIconDos },
  hoc: { bg: printButtonBgDos, icon: printButtonIconDos },
}

// Import runner number icons for header - DOS (6 runners)
import dosTabHead1 from '@/assets/svg/bg_294_tabHeadColumn_tabHeadNumb_dos_number1.svg'
import dosTabHead2 from '@/assets/svg/bg_295_tabHeadColumn_tabHeadNumb_dos_number2.svg'
import dosTabHead3 from '@/assets/svg/bg_296_tabHeadColumn_tabHeadNumb_dos_number3.svg'
import dosTabHead4 from '@/assets/svg/bg_297_tabHeadColumn_tabHeadNumb_dos_number4.svg'
import dosTabHead5 from '@/assets/svg/bg_298_tabHeadColumn_tabHeadNumb_dos_number5.svg'
import dosTabHead6 from '@/assets/svg/bg_299_tabHeadColumn_tabHeadNumb_dos_number6.svg'

// Import runner number icons for header - DOE (8 runners)
import doeTabHead1 from '@/assets/svg/bg_199_tabHeadColumn_tabHeadNumb_doe_number1.svg'
import doeTabHead2 from '@/assets/svg/bg_200_tabHeadColumn_tabHeadNumb_doe_number2.svg'
import doeTabHead3 from '@/assets/svg/bg_201_tabHeadColumn_tabHeadNumb_doe_number3.svg'
import doeTabHead4 from '@/assets/svg/bg_202_tabHeadColumn_tabHeadNumb_doe_number4.svg'
import doeTabHead5 from '@/assets/svg/bg_203_tabHeadColumn_tabHeadNumb_doe_number5.svg'
import doeTabHead6 from '@/assets/svg/bg_204_tabHeadColumn_tabHeadNumb_doe_number6.svg'
import doeTabHead7 from '@/assets/svg/bg_205_tabHeadColumn_tabHeadNumb_doe_number7.svg'
import doeTabHead8 from '@/assets/svg/bg_206_tabHeadColumn_tabHeadNumb_doe_number8.svg'

// Import runner number icons for header - HOC (7 runners)
import hocTabHead1 from '@/assets/svg/bg_391_tabHeadColumn_tabHeadNumb_hoc_number1.svg'
import hocTabHead2 from '@/assets/svg/bg_392_tabHeadColumn_tabHeadNumb_hoc_number2.svg'
import hocTabHead3 from '@/assets/svg/bg_393_tabHeadColumn_tabHeadNumb_hoc_number3.svg'
import hocTabHead4 from '@/assets/svg/bg_394_tabHeadColumn_tabHeadNumb_hoc_number4.svg'
import hocTabHead5 from '@/assets/svg/bg_395_tabHeadColumn_tabHeadNumb_hoc_number5.svg'
import hocTabHead6 from '@/assets/svg/bg_396_tabHeadColumn_tabHeadNumb_hoc_number6.svg'
import hocTabHead7 from '@/assets/svg/bg_397_tabHeadColumn_tabHeadNumb_hoc_number7.svg'

// Runner icons by game type
const RUNNER_ICONS_BY_GAME = {
  dos: [dosTabHead1, dosTabHead2, dosTabHead3, dosTabHead4, dosTabHead5, dosTabHead6],
  dot: [dosTabHead1, dosTabHead2, dosTabHead3, dosTabHead4, dosTabHead5, dosTabHead6], // DOT uses same as DOS
  doe: [doeTabHead1, doeTabHead2, doeTabHead3, doeTabHead4, doeTabHead5, doeTabHead6, doeTabHead7, doeTabHead8],
  hoc: [hocTabHead1, hocTabHead2, hocTabHead3, hocTabHead4, hocTabHead5, hocTabHead6, hocTabHead7]
} as const

// Number of runners per game type
const RUNNERS_BY_GAME = {
  dos: 6,
  dot: 6,
  doe: 8,
  hoc: 7
} as const

export interface RaceOdds {
  raceNumber: string
  odds: number[] // Array of odds values (6, 7, or 8 depending on game)
}

interface CuotasProps {
  gameType?: 'dos' | 'dot' | 'doe' | 'hoc'
  oddsData?: RaceOdds[]
  pageSize?: 5 | 10 | 15 | 20
  onPageSizeChange?: (size: 5 | 10 | 15 | 20) => void
  onPrint?: (count: number) => Promise<void>
  printingCount?: number | null
}

// Mock data for DOS/DOT (6 runners) - 35 records to test scrolling
const MOCK_ODDS_6: RaceOdds[] = [
  { raceNumber: '0339', odds: [3.6, 7.9, 4.1, 10.3, 3.4, 8.4] },
  { raceNumber: '0340', odds: [9.2, 3.8, 3.4, 6.4, 5.7, 6.2] },
  { raceNumber: '0341', odds: [6.5, 4.4, 12.0, 2.9, 4.9, 6.7] },
  { raceNumber: '0342', odds: [7.4, 11.1, 4.9, 3.6, 6.1, 3.4] },
  { raceNumber: '0343', odds: [3.4, 9.7, 6.9, 3.7, 8.1, 4.4] },
  { raceNumber: '0344', odds: [9.1, 9.7, 3.9, 6.8, 4.0, 3.4] },
  { raceNumber: '0345', odds: [4.6, 8.1, 9.5, 3.3, 7.2, 3.7] },
  { raceNumber: '0346', odds: [3.5, 3.9, 5.6, 10.2, 5.6, 6.3] },
  { raceNumber: '0347', odds: [3.5, 8.6, 9.5, 6.3, 4.9, 3.4] },
  { raceNumber: '0348', odds: [3.5, 8.6, 3.5, 12.0, 3.3, 11.3] },
  { raceNumber: '0349', odds: [12.8, 3.1, 6.1, 3.9, 5.2, 6.6] },
  { raceNumber: '0350', odds: [3.9, 5.3, 3.3, 8.0, 4.9, 12.0] },
  { raceNumber: '0351', odds: [5.3, 5.0, 4.8, 5.5, 10.5, 3.5] },
  { raceNumber: '0352', odds: [4.9, 6.5, 8.7, 5.9, 3.0, 5.2] },
  { raceNumber: '0353', odds: [7.6, 7.1, 4.8, 5.9, 3.9, 3.9] },
  { raceNumber: '0354', odds: [3.2, 7.1, 8.1, 5.5, 3.9, 6.4] },
  { raceNumber: '0355', odds: [3.6, 9.2, 3.6, 11.7, 5.1, 4.5] },
  { raceNumber: '0356', odds: [3.6, 9.8, 4.8, 3.9, 4.8, 9.2] },
  { raceNumber: '0357', odds: [10.1, 6.7, 6.5, 3.5, 3.4, 5.6] },
  { raceNumber: '0358', odds: [4.4, 3.6, 6.2, 7.7, 9.8, 3.8] },
  { raceNumber: '0359', odds: [5.2, 4.1, 7.3, 8.9, 3.6, 4.7] },
  { raceNumber: '0360', odds: [8.1, 3.4, 5.5, 4.2, 9.3, 6.1] },
  { raceNumber: '0361', odds: [3.9, 6.8, 4.3, 7.1, 5.4, 8.2] },
  { raceNumber: '0362', odds: [6.3, 5.1, 9.7, 3.5, 4.8, 7.6] },
  { raceNumber: '0363', odds: [4.5, 8.3, 3.8, 6.9, 10.2, 3.4] },
  { raceNumber: '0364', odds: [7.8, 4.6, 5.9, 3.3, 6.5, 9.4] },
  { raceNumber: '0365', odds: [3.3, 7.2, 8.4, 5.1, 4.3, 11.5] },
  { raceNumber: '0366', odds: [5.7, 3.5, 6.1, 9.8, 4.2, 5.3] },
  { raceNumber: '0367', odds: [9.4, 5.8, 3.6, 4.7, 7.3, 4.1] },
  { raceNumber: '0368', odds: [4.2, 6.4, 10.3, 3.8, 5.9, 6.8] },
  { raceNumber: '0369', odds: [6.9, 4.3, 5.2, 8.1, 3.5, 7.4] },
  { raceNumber: '0370', odds: [3.7, 9.1, 4.6, 5.8, 6.7, 4.9] },
  { raceNumber: '0371', odds: [8.6, 3.9, 7.5, 4.4, 5.1, 6.2] },
  { raceNumber: '0372', odds: [5.4, 6.7, 3.4, 9.2, 4.8, 8.3] },
  { raceNumber: '0373', odds: [4.1, 5.5, 8.9, 3.6, 7.1, 5.6] },
]

// Mock data for DOE (8 runners)
const MOCK_ODDS_8: RaceOdds[] = [
  { raceNumber: '0336', odds: [16.6, 4.3, 10.1, 5.1, 12.8, 7.8, 5.7, 4.9] },
  { raceNumber: '0337', odds: [10.1, 5.6, 5.4, 7.3, 5.6, 5.8, 9.3, 8.7] },
  { raceNumber: '0338', odds: [9.9, 7.2, 4.6, 5.0, 12.1, 5.5, 15.9, 5.3] },
  { raceNumber: '0339', odds: [8.9, 9.7, 5.5, 7.6, 6.9, 6.4, 9.2, 4.3] },
  { raceNumber: '0340', odds: [7.4, 16.4, 3.4, 9.9, 4.3, 6.3, 8.5, 13.2] },
  { raceNumber: '0341', odds: [8.8, 4.6, 7.7, 5.4, 10.3, 6.6, 7.9, 6.6] },
  { raceNumber: '0342', odds: [4.3, 9.6, 7.4, 5.7, 9.5, 7.2, 6.1, 8.6] },
  { raceNumber: '0343', odds: [9.1, 5.9, 8.1, 4.9, 8.3, 5.4, 10.0, 6.2] },
  { raceNumber: '0344', odds: [13.3, 4.3, 4.4, 8.1, 14.4, 14.3, 4.3, 7.0] },
  { raceNumber: '0345', odds: [5.4, 4.6, 4.9, 6.7, 11.0, 5.5, 16.2, 12.7] },
  { raceNumber: '0346', odds: [13.0, 3.5, 5.0, 6.6, 6.2, 9.6, 12.5, 8.7] },
  { raceNumber: '0347', odds: [5.0, 4.4, 16.8, 10.1, 7.4, 5.6, 5.2, 12.9] },
  { raceNumber: '0348', odds: [4.5, 4.6, 8.5, 9.6, 11.0, 8.2, 15.2, 4.3] },
  { raceNumber: '0349', odds: [8.2, 7.4, 7.3, 10.1, 4.9, 13.5, 4.5, 5.5] },
  { raceNumber: '0350', odds: [7.1, 6.2, 6.0, 9.6, 6.4, 6.4, 8.3, 6.0] },
  { raceNumber: '0351', odds: [5.5, 14.6, 5.7, 6.0, 10.3, 10.9, 3.0, 17.1] },
  { raceNumber: '0352', odds: [17.0, 16.9, 4.8, 5.3, 17.0, 6.3, 4.3, 4.8] },
  { raceNumber: '0353', odds: [12.5, 8.2, 10.5, 9.2, 4.7, 7.1, 5.6, 4.3] },
  { raceNumber: '0354', odds: [4.7, 8.3, 5.2, 4.9, 12.4, 9.1, 5.5, 14.7] },
  { raceNumber: '0355', odds: [11.7, 9.3, 7.4, 9.8, 4.9, 7.0, 6.9, 3.9] },
]

// Mock data for HOC (7 runners)
const MOCK_ODDS_7: RaceOdds[] = [
  { raceNumber: '0339', odds: [3.6, 7.9, 4.1, 10.3, 3.4, 8.4, 5.2] },
  { raceNumber: '0340', odds: [9.2, 3.8, 3.4, 6.4, 5.7, 6.2, 4.1] },
  { raceNumber: '0341', odds: [6.5, 4.4, 12.0, 2.9, 4.9, 6.7, 7.3] },
  { raceNumber: '0342', odds: [7.4, 11.1, 4.9, 3.6, 6.1, 3.4, 5.8] },
  { raceNumber: '0343', odds: [3.4, 9.7, 6.9, 3.7, 8.1, 4.4, 6.1] },
  { raceNumber: '0344', odds: [9.1, 9.7, 3.9, 6.8, 4.0, 3.4, 4.9] },
  { raceNumber: '0345', odds: [4.6, 8.1, 9.5, 3.3, 7.2, 3.7, 8.2] },
  { raceNumber: '0346', odds: [3.5, 3.9, 5.6, 10.2, 5.6, 6.3, 3.9] },
  { raceNumber: '0347', odds: [3.5, 8.6, 9.5, 6.3, 4.9, 3.4, 7.1] },
  { raceNumber: '0348', odds: [3.5, 8.6, 3.5, 12.0, 3.3, 11.3, 4.5] },
  { raceNumber: '0349', odds: [12.8, 3.1, 6.1, 3.9, 5.2, 6.6, 5.0] },
  { raceNumber: '0350', odds: [3.9, 5.3, 3.3, 8.0, 4.9, 12.0, 6.8] },
  { raceNumber: '0351', odds: [5.3, 5.0, 4.8, 5.5, 10.5, 3.5, 4.2] },
  { raceNumber: '0352', odds: [4.9, 6.5, 8.7, 5.9, 3.0, 5.2, 9.1] },
  { raceNumber: '0353', odds: [7.6, 7.1, 4.8, 5.9, 3.9, 3.9, 5.5] },
  { raceNumber: '0354', odds: [3.2, 7.1, 8.1, 5.5, 3.9, 6.4, 7.8] },
  { raceNumber: '0355', odds: [3.6, 9.2, 3.6, 11.7, 5.1, 4.5, 4.3] },
  { raceNumber: '0356', odds: [3.6, 9.8, 4.8, 3.9, 4.8, 9.2, 6.0] },
  { raceNumber: '0357', odds: [10.1, 6.7, 6.5, 3.5, 3.4, 5.6, 5.9] },
  { raceNumber: '0358', odds: [4.4, 3.6, 6.2, 7.7, 9.8, 3.8, 4.7] },
]

// Format odds number for display (Spanish format: comma as decimal)
const formatOdds = (value: number): string => {
  return value.toFixed(1).replace('.', ',')
}

function Cuotas({
  gameType = 'dos',
  oddsData,
  pageSize = 5,
  onPrint,
  printingCount = null
}: CuotasProps) {
  // Ref for the scrollable container
  const scrollRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)

  // State for custom scrollbar
  const [scrollState, setScrollState] = useState({
    thumbHeight: 0,
    thumbTop: 0,
    showScrollbar: false
  })

  // Get runner count and icons for current game
  const runnerCount = RUNNERS_BY_GAME[gameType]
  const runnerIcons = RUNNER_ICONS_BY_GAME[gameType]

  // Get default mock data based on runner count
  const defaultOddsData = useMemo(() => {
    if (runnerCount === 8) return MOCK_ODDS_8
    if (runnerCount === 7) return MOCK_ODDS_7
    return MOCK_ODDS_6
  }, [runnerCount])

  // Use provided data or default mock data (handle empty arrays)
  const data = (oddsData && oddsData.length > 0) ? oddsData : defaultOddsData

  // Limit results to page size
  const visibleOdds = useMemo(() => {
    return data.slice(0, pageSize)
  }, [data, pageSize])

  // Handle scroll to update custom scrollbar position
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return

    const { scrollTop, scrollHeight, clientHeight } = el

    // Only show scrollbar if there's overflow
    const showScrollbar = scrollHeight > clientHeight

    if (!showScrollbar) {
      setScrollState({ thumbHeight: 0, thumbTop: 0, showScrollbar: false })
      return
    }

    // Thumb height proportional to visible content
    const thumbHeight = (clientHeight / scrollHeight) * 100

    // Thumb position
    const maxScroll = scrollHeight - clientHeight
    const thumbTop = maxScroll > 0
      ? (scrollTop / maxScroll) * (100 - thumbHeight)
      : 0

    setScrollState({ thumbHeight, thumbTop, showScrollbar })
  }, [])

  // Initialize scrollbar state on mount and when pageSize changes
  useEffect(() => {
    // Defer to avoid synchronous setState during render
    requestAnimationFrame(() => {
      handleScroll()
    })
  }, [handleScroll, pageSize])

  // Handle thumb drag
  const handleThumbMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    document.body.style.userSelect = 'none'
  }, [])

  // Handle mouse move for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !trackRef.current || !scrollRef.current) return

      const track = trackRef.current
      const scrollEl = scrollRef.current
      const trackRect = track.getBoundingClientRect()

      // Calculate position relative to track
      const relativeY = e.clientY - trackRect.top
      const trackHeight = trackRect.height
      const thumbHeight = (scrollState.thumbHeight / 100) * trackHeight

      // Calculate scroll position
      const maxThumbTop = trackHeight - thumbHeight
      const clampedY = Math.max(0, Math.min(relativeY - thumbHeight / 2, maxThumbTop))
      const scrollRatio = clampedY / maxThumbTop

      // Apply scroll
      const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight
      scrollEl.scrollTop = scrollRatio * maxScroll
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [scrollState.thumbHeight])


  // Get CSS class for layout based on runner count
  const layoutClass = useMemo(() => {
    if (runnerCount === 8) return styles.layout8
    if (runnerCount === 7) return styles.layout7
    return styles.layout6
  }, [runnerCount])

  return (
    <div className={styles.cuotasContainer}>
      {/* SVG oculto con clipPath para la forma del panel */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <clipPath id="cuotas-clip" clipPathUnits="objectBoundingBox">
            <path d="M1,0 H0 V0.941 H0.88 L1,0 Z" />
          </clipPath>
        </defs>
      </svg>

      {/* BetsZone background */}
      <img src={betsZoneBg} alt="" className={styles.betsZoneBg} />

      {/* Custom scrollbar - OUTSIDE the clip-path */}
      {scrollState.showScrollbar && (
        <div className={styles.customScrollbar}>
          {/* Track */}
          <div ref={trackRef} className={styles.scrollbarTrack}>
            {/* Thumb */}
            <div
              className={styles.scrollbarThumb}
              onMouseDown={handleThumbMouseDown}
              style={{
                height: `${scrollState.thumbHeight}%`,
                top: `${scrollState.thumbTop}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Main cuotas panel - clipped to SVG shape */}
      <div className={`${styles.cuotasPanel} ${layoutClass}`}>
        {/* Table header */}
        <div className={styles.tableHeader}>
          <div className={styles.headerRaceNum}>CARRERAS Nu.</div>
          <div className={styles.headerOdds}>
            {runnerIcons.map((icon, index) => (
              <div key={index} className={styles.headerOddsIcon}>
                <img src={icon} alt={`${index + 1}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Odds list - native scrollbar hidden */}
        <div
          ref={scrollRef}
          className={styles.oddsList}
          onScroll={handleScroll}
        >
          {visibleOdds.map((race, rowIndex) => (
            <div
              key={race.raceNumber}
              className={`${styles.oddsRow} ${rowIndex % 2 === 1 ? styles.oddsRowOdd : ''}`}
            >
              <div className={styles.raceNumberCell}>{race.raceNumber}</div>
              <div className={styles.oddsValues}>
                {race.odds.slice(0, runnerCount).map((odd, colIndex) => (
                  <div key={colIndex} className={styles.oddsCell}>
                    {formatOdds(odd)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Print buttons - right side */}
      <div className={styles.paginationContainer}>
        {([5, 10, 20] as const).map((size) => (
          <button
            key={size}
            className={`${styles.paginationButton} ${printingCount === size ? styles.paginationButtonActive : ''}`}
            onClick={() => onPrint?.(size)}
            disabled={printingCount !== null}
          >
            <img src={(BUTTON_ASSETS[gameType] || BUTTON_ASSETS.dos).bg} alt="" className={styles.paginationBg} />
            <img src={(BUTTON_ASSETS[gameType] || BUTTON_ASSETS.dos).icon} alt="" className={styles.paginationIcon} />
            {/* Web-skin printer icon (classic uses the SVG image above). */}
            <svg className={styles.webPrintIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" rx="1" />
            </svg>
            <span className={styles.paginationText}>{size}</span>
            {printingCount === size && <div className={styles.printSpinner} />}
          </button>
        ))}
      </div>
    </div>
  )
}

export default memo(Cuotas)
