import { memo, useMemo } from 'react'
import type { Bet } from '@/types/bet'
import styles from '@/pages/Dashboard/Dashboard.module.css'

// Trap colors — mirror the runner-selector chips in the web skin
// (Dashboard.module.css `.selectionButton:nth-child(n)`), so a bet line reads
// the same color language as the board.
const TRAP_BG: Record<number, string> = {
  1: 'linear-gradient(180deg, #e60000, #bd0000)',
  2: 'linear-gradient(180deg, #0076fe, #0033d9)',
  3: 'linear-gradient(180deg, #ebebea, #d0d3d3)',
  4: 'linear-gradient(180deg, #383838, #0a0a0a)',
  5: 'linear-gradient(180deg, #ffaf00, #fb8200)',
  6: 'repeating-linear-gradient(135deg, #1a1a1a 0 0.6cqi, #ebebea 0.6cqi 1.2cqi)',
  7: 'repeating-linear-gradient(135deg, #179c2b 0 0.6cqi, #ffffff 0.6cqi 1.2cqi)',
  8: 'repeating-linear-gradient(135deg, #fb8200 0 0.6cqi, #1a1a1a 0.6cqi 1.2cqi)',
}
// Runners whose number needs dark ink for contrast (white / orange traps).
const TRAP_INK: Record<number, string> = { 3: '#1a1a1a', 5: '#241800' }

function Chip({ n }: { n: number }) {
  return (
    <span
      className={styles.webBetChip}
      style={{ background: TRAP_BG[n] ?? '#555', color: TRAP_INK[n] ?? '#fff' }}
    >
      {n}
    </span>
  )
}

export interface WebBetColumnProps {
  bets: Bet[]
  onRemove: (id: number) => void
}

/**
 * WEB SKIN ONLY — a left-hand bet column (lobby-style). Hidden in the classic
 * skin via `display:none` base rule; the parent shifts the runner board to the
 * right while it is open (`[data-webbets="true"]`). Each line shows its
 * trap-colored runner chip(s), odds, stake and an individual remove (×).
 */
function WebBetColumn({ bets, onRemove }: WebBetColumnProps) {
  const open = bets.length > 0
  const totalBet = useMemo(
    () => bets.reduce((acc, b) => acc + b.amount, 0),
    [bets],
  )

  return (
    <aside
      className={styles.webBetColumn}
      data-open={open ? 'true' : undefined}
      aria-hidden={!open}
    >
      <div className={styles.webBetColHeader}>
        <span className={styles.webBetColTitle}>APUESTAS</span>
        <span className={styles.webBetColCount}>{bets.length}</span>
      </div>

      <ul className={styles.webBetColList}>
        {bets.map((bet, i) => (
          <li key={bet.id} className={styles.webBetRow}>
            <span className={styles.webBetIdx}>{i + 1}</span>
            <span className={styles.webBetChips}>
              <Chip n={bet.first} />
              {bet.second !== undefined && (
                <>
                  <span className={styles.webBetSep}>›</span>
                  <Chip n={bet.second} />
                </>
              )}
            </span>
            <span className={styles.webBetMeta}>
              <span className={styles.webBetOdds}>{bet.odds > 0 ? bet.odds.toFixed(2) : '—'}</span>
              <span className={styles.webBetAmount}>{bet.amount}</span>
            </span>
            <button
              type="button"
              className={styles.webBetRemove}
              onClick={() => onRemove(bet.id)}
              aria-label={`Quitar apuesta ${i + 1}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <div className={styles.webBetColFooter}>
        <span className={styles.webBetTotalLabel}>TOTAL</span>
        <span className={styles.webBetTotalValue}>
          {totalBet.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
    </aside>
  )
}

export default memo(WebBetColumn)
