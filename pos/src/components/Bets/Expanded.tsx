import { memo, useMemo } from 'react'
import { type Bet } from './index'
import { POSITIONS_IMAGE } from './constants'

interface Props {
  totalBet: number
  bets: Bet[]
  offset?: number
}

// Column proportions — Nu narrower so columns sit toward the left; TICKET wider
// so the yellow total band extends further to the left.
const COL_NU = '20%'
const COL_CUOTAS = '18%'
const COL_MONTO = '18%'
const COL_TICKET = '44%'

// Yellow gradient — captured from vendor:
// linear-gradient(rgba(244,245,0,.97) 0%, rgb(229,211,0) 3%, rgb(214,197,0))
const YELLOW_BG = 'linear-gradient(180deg, rgba(244,245,0,0.97) 0%, rgb(229,211,0) 3%, rgb(214,197,0) 100%)'

// Yellow band's right edge mirrors the panel's clip-path angle (same slope as
// the panel's bottom-right diagonal)
const YELLOW_CLIP = 'polygon(0 0, 100% 0, 97% 100%, 0 100%)'

function Expanded({ totalBet, bets }: Props) {
  const containerStyle = useMemo(() => ({
    background: 'rgba(70, 80, 95, 0.92)',
    clipPath: 'url(#expanded-clip)',
    fontFamily: '"DIN Next LT Pro", Helvetica, sans-serif',
  }), [])

  const yellowCellStyle = useMemo(() => ({
    background: YELLOW_BG,
    color: '#000',
    fontSize: '2rem',
    fontWeight: 700,
    textAlign: 'center' as const,
    lineHeight: 1.2,
  }), [])

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden" style={containerStyle}>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <clipPath id="expanded-clip" clipPathUnits="objectBoundingBox">
            {/* Exact path from vendor's ticketBig.svg (1624x819 viewBox).
                Coordinates normalized to 0-1:
                - Top-right (1,0) → top-left (0,0) → bottom-left (0, 0.982)
                - Bottom edge to (0.895, 0.982), then cubic bezier curving up
                  to (0.914, 0.951) and line back to top-right
                The right edge slants inward and meets the bottom with a
                soft curve at the corner. */}
            <path d="M 1,0 L 0,0 L 0,0.982 L 0.895,0.982 C 0.905,0.982 0.913,0.969 0.914,0.951 L 1,0 Z" />
          </clipPath>
        </defs>
      </svg>

      {/* Header row: Nu. | Cuotas | Monto | TICKET. The TICKET column has the yellow
          total band extending across the right portion with the same angle as the panel. */}
      <div
        className="grid shrink-0 items-stretch"
        style={{
          gridTemplateColumns: `${COL_NU} ${COL_CUOTAS} ${COL_MONTO} ${COL_TICKET}`,
          background: 'rgba(255,255,255,0.1)',
          height: '2.6rem',
        }}
      >
        <div className="flex items-center justify-center text-white" style={{ fontSize: '1.35rem', fontWeight: 300 }}>
          Nu.
        </div>
        <div className="flex items-center justify-center text-white" style={{ fontSize: '1.35rem', fontWeight: 300 }}>
          Cuotas
        </div>
        <div className="flex items-center justify-center text-white" style={{ fontSize: '1.35rem', fontWeight: 300 }}>
          Monto
        </div>
        {/* TICKET column: label on the left, yellow band on the right with angled edge */}
        <div className="relative flex items-center">
          <span
            className="text-white"
            style={{ fontSize: '1.35rem', fontWeight: 300, paddingLeft: '4rem', zIndex: 1 }}
          >
            TICKET
          </span>
          <div
            className="absolute top-0 h-full flex items-center justify-center"
            style={{
              ...yellowCellStyle,
              right: '4px',
              width: 'calc(50% - 49px)',
              clipPath: YELLOW_CLIP,
            }}
          >
            {totalBet.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Body: bets list — same grid columns as header for perfect alignment */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {bets.map((bet, index) => (
          <div
            key={bet.id}
            className="grid items-center border-b border-white/5"
            style={{
              gridTemplateColumns: `${COL_NU} ${COL_CUOTAS} ${COL_MONTO} ${COL_TICKET}`,
              height: '3.5rem',
            }}
          >
            <div className="text-center text-white" style={{ fontSize: '1.4rem', fontWeight: 400 }}>
              {index + 1}
            </div>
            <div className="text-center text-white" style={{ fontSize: '1.4rem', fontWeight: 400 }}>
              {bet.odds > 0 ? bet.odds.toFixed(1).replace('.', ',') : '-'}
            </div>
            <div className="text-center text-white" style={{ fontSize: '1.4rem', fontWeight: 400 }}>
              {bet.amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex gap-1 justify-start items-center" style={{ paddingLeft: '2.1rem' }}>
              <img
                src={POSITIONS_IMAGE[bet.first]}
                alt={`${bet.first}`}
                style={{ width: '3.5rem', height: '2.8rem', objectFit: 'fill' }}
              />
              {bet.second !== undefined && (
                <img
                  src={POSITIONS_IMAGE[bet.second]}
                  alt={`${bet.second}`}
                  style={{ width: '3.5rem', height: '2.8rem', objectFit: 'fill' }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom hint */}
      <div
        className="uppercase italic shrink-0 flex items-center justify-end"
        style={{
          background: 'rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.45)',
          fontSize: '1.1rem',
          letterSpacing: '3px',
          padding: '0.2rem 8rem 0.9rem 1.5rem',
          fontWeight: 400,
          lineHeight: 1.2,
        }}
      >
        Haga clic o deslice para cerrar el ticket
      </div>
    </div>
  )
}

export default memo(Expanded)
