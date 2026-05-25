import { memo, useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { PositionIndicator } from './PositionIndicator'
import styles from './Results.module.css'

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

export interface RaceResult {
  raceNumber: string
  first: number
  second: number
  multiplier?: number
}

interface ResultsProps {
  gameType?: 'dos' | 'dot' | 'doe' | 'hoc'
  results?: RaceResult[]
  pageSize?: 5 | 10 | 15 | 20
  onPageSizeChange?: (size: 5 | 10 | 15 | 20) => void
  onPrint?: (count: number) => Promise<void>
  printingCount?: number | null
}

// Mock data for demonstration
const MOCK_RESULTS: RaceResult[] = [
  { raceNumber: '0263', first: 2, second: 3 },
  { raceNumber: '0262', first: 6, second: 2 },
  { raceNumber: '0261', first: 5, second: 3 },
  { raceNumber: '0260', first: 2, second: 1 },
  { raceNumber: '0259', first: 2, second: 6 },
  { raceNumber: '0258', first: 3, second: 4 },
  { raceNumber: '0257', first: 3, second: 5 },
  { raceNumber: '0256', first: 2, second: 6 },
  { raceNumber: '0255', first: 3, second: 2 },
  { raceNumber: '0254', first: 1, second: 3, multiplier: 2 },
  { raceNumber: '0253', first: 4, second: 1 },
  { raceNumber: '0252', first: 5, second: 2 },
  { raceNumber: '0251', first: 3, second: 6 },
  { raceNumber: '0250', first: 1, second: 4 },
  { raceNumber: '0249', first: 6, second: 3 },
  { raceNumber: '0248', first: 2, second: 5 },
  { raceNumber: '0247', first: 4, second: 2 },
  { raceNumber: '0246', first: 1, second: 6 },
  { raceNumber: '0245', first: 5, second: 4, multiplier: 3 },
  { raceNumber: '0244', first: 3, second: 1 },
  { raceNumber: '0243', first: 2, second: 5 },
  { raceNumber: '0242', first: 6, second: 1 },
  { raceNumber: '0241', first: 4, second: 3 },
  { raceNumber: '0240', first: 1, second: 2, multiplier: 2 },
  { raceNumber: '0239', first: 5, second: 6 },
  { raceNumber: '0238', first: 3, second: 4 },
  { raceNumber: '0237', first: 2, second: 1 },
  { raceNumber: '0236', first: 6, second: 5 },
  { raceNumber: '0235', first: 4, second: 2 },
  { raceNumber: '0234', first: 1, second: 3 },
]

function Results({
  gameType = 'dos',
  results,
  pageSize = 5,
  onPrint,
  printingCount = null
}: ResultsProps) {
  // Use mock data if no results provided or empty array
  const displayResults = (results && results.length > 0) ? results : MOCK_RESULTS
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

  // Limit results to page size
  const visibleResults = useMemo(() => {
    return displayResults.slice(0, pageSize)
  }, [displayResults, pageSize])

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


  return (
    <div className={styles.resultsContainer}>
      {/* SVG oculto con clipPath para la forma del panel */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <clipPath id="betszone-clip" clipPathUnits="objectBoundingBox">
            <path d="M1,0 H0 V0.982 H0.862 C0.871,0.982 0.879,0.969 0.881,0.951 L1,0 Z" />
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

      {/* Main results panel - clipped to SVG shape */}
      <div className={styles.resultsPanel}>
        {/* Table header */}
        <div className={styles.tableHeader}>
          <div className={styles.headerRaceNum}>CARRERAS Nu.</div>
          <div className={styles.headerResult}>RESULTADO</div>
        </div>

        {/* Results list - native scrollbar hidden */}
        <div
          ref={scrollRef}
          className={styles.resultsList}
          onScroll={handleScroll}
        >
          <div className={styles.resultsListContent}>
            {visibleResults.map((result, index) => (
              <div
                key={result.raceNumber}
                className={`${styles.resultRow} ${index % 2 === 0 ? styles.resultRowOdd : ''} ${index === 0 ? styles.resultRowFirst : ''}`}
              >
                <div className={styles.raceNumberCell}>{result.raceNumber}</div>
                <div className={styles.resultCell}>
                  <PositionIndicator number={result.first} gameType={gameType} />
                  <PositionIndicator number={result.second} gameType={gameType} />
                  {result.multiplier && (
                    <span className={styles.multiplier}>x{result.multiplier}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
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
            <span className={styles.paginationText}>{size}</span>
            {printingCount === size && <div className={styles.printSpinner} />}
          </button>
        ))}
      </div>
    </div>
  )
}

export default memo(Results)
