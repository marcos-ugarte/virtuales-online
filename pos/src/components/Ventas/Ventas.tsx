import { memo, useMemo, useRef, useState, useCallback, useEffect } from 'react'
import styles from './Ventas.module.css'

// Background image
import salesBg from '@/assets/svg/sales_bg.svg'

// Status icons
import statusLost from '@/assets/svg/status-lost.svg'
import statusPending from '@/assets/svg/status-pending.svg'
import statusWin from '@/assets/svg/status-win.svg'
import statusCancelled from '@/assets/svg/status-cancelled.svg'

// Game type icons (same as game selector)
import gameIconDos from '@/assets/svg/bg_116_chGaButton_dos_chGaIcon.svg'
import gameIconDot from '@/assets/svg/bg_117_chGaButton_dot_chGaIcon.svg'
import gameIconDoe from '@/assets/svg/bg_118_chGaButton_doe_chGaIcon_selected.svg'
import gameIconHoc from '@/assets/svg/bg_119_chGaButton_hoc_chGaIcon.svg'

// Print icon for reprint button
import printIcon from '@/assets/svg/img_5_print.svg'

// Balance button background
import balanceButtonBg from '@/assets/svg/bg_213_balanceButtBack_balanceIcoButt_stdShadow.svg'

export type SalesStatus = 'pending' | 'win' | 'lost' | 'cancelled'

export interface SalesRecord {
  raceNumber: string
  dateTime: string
  plays: number
  amount: number
  investment: number
  payout: number
  balance: number
  gameType: string
  status: SalesStatus
}

// Status icon map
const STATUS_ICONS: Record<SalesStatus, string> = {
  pending: statusPending,
  win: statusWin,
  lost: statusLost,
  cancelled: statusCancelled
}

// Game type icon map
const GAME_ICONS: Record<string, string> = {
  DOS: gameIconDos,
  DOT: gameIconDot,
  DOE: gameIconDoe,
  HOC: gameIconHoc
}

interface VentasProps {
  salesData?: SalesRecord[]
  onBalance?: () => void
  onReprint?: (index: number) => void
  reprintingIndex?: number | null
  isBalancing?: boolean
}


// Format currency for display (Spanish format)
const formatCurrency = (value: number): string => {
  return value.toFixed(2).replace('.', ',')
}

function Ventas({
  salesData,
  onBalance,
  onReprint,
  reprintingIndex = null,
  isBalancing = false
}: VentasProps) {
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

  const data = salesData || []

  // Show all sales (no pagination)
  const visibleSales = data

  // Calculate totals — matches original vendor POS:
  // - Monto: sum of all non-cancelled tickets
  // - Inversión: always 0
  // - Pagar: sum of payout for resolved tickets (lost=0, won=payout)
  // - Balance: lost=+monto, won pagado=+(monto-pago), pending=0, cancelled=0
  const totals = useMemo(() => {
    return visibleSales.reduce(
      (acc, record) => {
        if (record.status === 'cancelled' || record.status === 'pending') {
          return {
            ...acc,
            plays: acc.plays + record.plays,
            amount: record.status === 'pending' ? acc.amount : acc.amount, // pending doesn't count in monto
          }
        }
        // lost: balance += monto, payout = 0
        // win: balance += (monto - payout), payout counted
        const balanceAdd = record.status === 'lost'
          ? record.amount
          : record.payout > 0 ? record.amount - record.payout : 0
        return {
          plays: acc.plays + record.plays,
          amount: acc.amount + record.amount,
          investment: 0,
          payout: acc.payout + record.payout,
          balance: acc.balance + balanceAdd,
        }
      },
      { plays: 0, amount: 0, investment: 0, payout: 0, balance: 0 }
    )
  }, [visibleSales])

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

  // Initialize scrollbar state on mount
  useEffect(() => {
    // Defer to avoid synchronous setState during render
    requestAnimationFrame(() => {
      handleScroll()
    })
  }, [handleScroll])

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
    <div className={styles.ventasContainer}>
      {/* SVG oculto con clipPath para la forma del panel */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <clipPath id="ventas-clip" clipPathUnits="objectBoundingBox">
            {/* Parallelogram shape: top full width, bottom narrower (slant on right), leaving space for yellow banner */}
            <path d="M0,0 L0.98,0 L0.90,0.79 L0,0.79 Z" />
          </clipPath>
        </defs>
      </svg>

      {/* Background image - SVG already has parallelogram shape with rounded corner */}
      <img src={salesBg} alt="" className={styles.ventasBg} />

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

      {/* Main ventas panel - clipped to parallelogram */}
      <div className={styles.ventasPanel}>
        {/* Table header */}
        <div className={styles.tableHeader}>
          <div className={`${styles.headerCell} ${styles.colNu}`}>Nu.</div>
          <div className={`${styles.headerCell} ${styles.colPrint}`}></div>
          <div className={`${styles.headerCell} ${styles.colFechaHora}`}>Fecha/Hora</div>
          <div className={`${styles.headerCell} ${styles.colJugadas}`}>Jugadas</div>
          <div className={`${styles.headerCell} ${styles.colMonto}`}>Monto</div>
          <div className={`${styles.headerCell} ${styles.colInversion}`}>Inversión</div>
          <div className={`${styles.headerCell} ${styles.colPagar}`}>Pagar</div>
          <div className={`${styles.headerCell} ${styles.colBalance}`}>Balance</div>
          <div className={`${styles.headerCell} ${styles.colJuego}`}>Juego</div>
          <div className={`${styles.headerCell} ${styles.colEstado}`}>Estado</div>
        </div>

        {/* Sales list - native scrollbar hidden */}
        <div
          ref={scrollRef}
          className={styles.salesList}
          onScroll={handleScroll}
        >
          <div className={styles.salesListContent}>
            {visibleSales.map((record, rowIndex) => (
              <div
                key={`${record.raceNumber}-${rowIndex}`}
                className={`${styles.salesRow} ${rowIndex % 2 === 0 ? styles.salesRowOdd : styles.salesRowEven}`}
              >
                <div className={`${styles.salesCell} ${styles.colNu}`}>{record.raceNumber}</div>
                <div className={`${styles.salesCell} ${styles.colPrint}`}>
                  <button className={styles.printButton} title="Reimprimir ticket" onClick={() => onReprint?.(rowIndex)} disabled={reprintingIndex !== null}>
                    <img src={printIcon} alt="Reimprimir" className={styles.printIcon} />
                    {reprintingIndex === rowIndex && <div className={styles.printSpinner} />}
                  </button>
                </div>
                <div className={`${styles.salesCell} ${styles.colFechaHora}`}>{record.dateTime}</div>
                <div className={`${styles.salesCell} ${styles.colJugadas}`}>{record.plays}</div>
                <div className={`${styles.salesCell} ${styles.colMonto}`}>{formatCurrency(record.amount)}</div>
                <div className={`${styles.salesCell} ${styles.colInversion}`}>{formatCurrency(record.investment)}</div>
                <div className={`${styles.salesCell} ${styles.colPagar}`}>{formatCurrency(record.payout)}</div>
                <div className={`${styles.salesCell} ${styles.colBalance}`}>{formatCurrency(record.balance)}</div>
                <div className={`${styles.salesCell} ${styles.colJuego}`}>
                  <img src={GAME_ICONS[record.gameType]} alt={record.gameType} className={styles.gameIcon} />
                </div>
                <div className={`${styles.salesCell} ${styles.colEstado}`}>
                  <img src={STATUS_ICONS[record.status]} alt={record.status} className={styles.statusIcon} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Summary footer - positioned absolutely over yellow banner */}
      <div className={styles.summaryFooter}>
        {/* Empty columns to match Nu. and Fecha/Hora */}
        <div className={styles.colNu}></div>
        <div className={styles.colPrint}></div>
        <div className={styles.colFechaHora}></div>
        {/* Summary cells using same column widths as data rows */}
        <div className={`${styles.summaryCell} ${styles.colJugadas}`}>
          <span className={styles.summaryTitle}>Jugadas</span>
          <span className={styles.summaryValue}>{totals.plays}</span>
        </div>
        <div className={`${styles.summaryCell} ${styles.colMonto}`}>
          <span className={styles.summaryTitle}>Monto</span>
          <span className={styles.summaryValue}>{formatCurrency(totals.amount)}</span>
        </div>
        <div className={`${styles.summaryCell} ${styles.colInversion}`}>
          <span className={styles.summaryTitle}>Inversión</span>
          <span className={styles.summaryValue}>{formatCurrency(totals.investment)}</span>
        </div>
        <div className={`${styles.summaryCell} ${styles.colPagar}`}>
          <span className={styles.summaryTitle}>Pagar</span>
          <span className={styles.summaryValue}>{formatCurrency(totals.payout)}</span>
        </div>
        <div className={`${styles.summaryCell} ${styles.colBalance}`}>
          <span className={styles.summaryTitle}>Balance</span>
          <span className={styles.summaryValue}>{formatCurrency(totals.balance)}</span>
        </div>
      </div>

      {/* Balance button - yellow parallelogram */}
      <button className={styles.balanceButton} disabled={isBalancing} onClick={() => { if (isBalancing) return; console.log('[BALANCE] button clicked'); onBalance?.() }}>
        <img src={balanceButtonBg} alt="" className={styles.balanceButtonBg} />
        <span className={styles.balanceButtonText}>BALANCE</span>
      </button>
    </div>
  )
}

export default memo(Ventas)
