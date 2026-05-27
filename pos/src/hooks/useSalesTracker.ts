import { useState, useCallback, useEffect } from 'react'
import type { SalesRecord, SalesStatus } from '@/components/Ventas'

// Map game type from API to display format
const GAME_TYPE_MAP: Record<string, string> = {
  dog6: 'DOS',
  dog63: 'DOT',
  dog8: 'DOE',
  horsec: 'HOC',
  // Wallet movements shown in the Ventas table (not real games):
  RECARGA: 'RECARGA',
  COBRO: 'COBRO',
}

// Participants per game type (for exacta index calculation)
const GAME_PARTICIPANTS: Record<string, number> = {
  dog6: 6, dog63: 6, dog8: 8, horsec: 7
}

// Calculate odds index for a bet
function getOddsIndex(bet: TicketBet, participants: number): number {
  if (bet.second === undefined) {
    // WIN: runner - 1
    return bet.first - 1
  }
  // EXACTA: first * (N-1) + second - offset
  const factor = participants - 1
  const offset = bet.second > bet.first ? 1 : 0
  return bet.first * factor + bet.second - offset
}

// Map game prefix to display format
const GAME_PREFIX_MAP: Record<string, string> = {
  dos: 'DOS',
  dot: 'DOT',
  doe: 'DOE',
  hoc: 'HOC'
}

export interface TicketBet {
  first: number
  second?: number
  amount: number
  isWinner?: boolean
  winOdds?: number   // Odds of the winning bet (set when race result arrives)
  winAmount?: number // Payout for this specific bet
}

export interface CreatedTicket {
  ticketId: string
  gameId: string        // e.g., "141_101_202601040196"
  gameType: string      // e.g., "dog6"
  gamePrefix: string    // e.g., "dos"
  raceNumber: string    // e.g., "0196"
  bets: TicketBet[]
  totalAmount: number
  createdAt: Date
  status: SalesStatus
  payout: number
  isPaid: boolean       // True after operator scans/pays or balance autopays
  maxBenefit?: string   // Formatted max payout at ticket creation (for COPIA reprint)
  betCuotas?: string[]  // Per-bet odds at creation time (for COPIA reprint)
}

export interface GameResult {
  raceId: string
  gameType?: string  // e.g., "dog6", "dog8" — prevents cross-game false matches
  first: number
  second: number
  third?: number
  odds?: number[]  // Full odds array for payout calculation
  bonus?: number   // Race bonus multiplier (1, 2, 3) — multiplies winning odds
}

interface UseSalesTrackerOptions {
  persistToStorage?: boolean
  storageKey?: string
}

const STORAGE_KEY = 'virtual-racing-pos-sales'

export function useSalesTracker(options: UseSalesTrackerOptions = {}) {
  const { persistToStorage = true, storageKey = STORAGE_KEY } = options

  // Load initial state from localStorage if available
  const [tickets, setTickets] = useState<CreatedTicket[]>(() => {
    if (persistToStorage && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          const parsed = JSON.parse(stored)
          // Convert date strings back to Date objects
          return parsed.map((t: CreatedTicket) => ({
            ...t,
            createdAt: new Date(t.createdAt),
            isPaid: t.isPaid ?? false, // backwards compat with old localStorage data
          }))
        }
      } catch (e) {
        console.warn('[useSalesTracker] Failed to load from localStorage:', e)
      }
    }
    return []
  })

  // Persist to localStorage when tickets change
  useEffect(() => {
    if (persistToStorage && typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(tickets))
      } catch (e) {
        console.warn('[useSalesTracker] Failed to save to localStorage:', e)
      }
    }
  }, [tickets, persistToStorage, storageKey])

  // Add a new ticket when created
  const addTicket = useCallback((
    ticketId: string,
    gameId: string,
    gameType: string,
    gamePrefix: string,
    bets: TicketBet[],
    maxBenefit?: string,
    betCuotas?: string[]
  ) => {
    // Extract race number from gameId (last 4 digits of the date+race portion)
    // gameId format: "141_101_202601040196" -> race number is "0196"
    const parts = gameId.split('_')
    const dateRace = parts[2] || ''
    const raceNumber = dateRace.slice(-4) // Last 4 digits

    const totalAmount = bets.reduce((sum, b) => sum + b.amount, 0)

    const newTicket: CreatedTicket = {
      ticketId,
      gameId,
      gameType,
      gamePrefix,
      raceNumber,
      bets,
      totalAmount,
      createdAt: new Date(),
      status: 'pending',
      payout: 0,
      isPaid: false,
      maxBenefit,
      betCuotas
    }

    setTickets(prev => [newTicket, ...prev]) // Add to beginning (newest first)

    console.log('[useSalesTracker] Ticket added:', newTicket)

    return newTicket
  }, [])

  // Record a wallet movement (recarga/cobro) in the Ventas table so the cashier
  // sees its balance impact: a RECARGA shows as a sold ticket (counts in Monto);
  // a COBRO shows as a paid winning ticket (counts in Pagar → subtracts from the
  // running balance). `phone` last-4 is used as the row "number".
  const addWalletMovement = useCallback((kind: 'recarga' | 'cobro', amount: number, phone: string) => {
    const isCobro = kind === 'cobro'
    const newTicket: CreatedTicket = {
      ticketId: `${isCobro ? 'COBRO' : 'RECARGA'}-${Date.now()}-${phone.slice(-4)}`,
      gameId: '',
      gameType: isCobro ? 'COBRO' : 'RECARGA',
      gamePrefix: '',
      raceNumber: phone.slice(-4),
      bets: [],
      totalAmount: isCobro ? 0 : amount, // recarga → Monto; cobro → 0 stake
      createdAt: new Date(),
      // Both resolve IMMEDIATELY in the balance (no race to wait for):
      //  recarga → 'lost' (house keeps the cash → +amount to balance now),
      //  cobro   → 'win' + payout (→ −amount to balance now). Neither is
      //  'pending', so they never get reprocessed by race results either.
      status: isCobro ? 'win' : 'lost',
      payout: isCobro ? amount : 0,      // cobro → Pagar (resta al balance)
      isPaid: true,                      // resolved + paid at once
    }
    setTickets(prev => [newTicket, ...prev])
    return newTicket
  }, [])

  // Update ticket status based on game result
  const updateTicketStatus = useCallback((result: GameResult) => {
    setTickets(prev => prev.map(ticket => {
      // Only update pending tickets for this race AND same game type
      // Match by raceNumber + gameType to prevent cross-game false matches
      // (different games can share the same raceNumber, e.g. dog6 #0277 vs dog8 #0277)
      if (ticket.status !== 'pending' || ticket.raceNumber !== result.raceId
          || (result.gameType && ticket.gameType !== result.gameType)) {
        return ticket
      }

      // Check if any bet is a winner using real odds
      // Bonus multiplier (1, 2, 3) multiplies the winning odds.
      // Example: $25 × 3.8 odd × bonus 2 = $190 payout (instead of $95)
      const participants = GAME_PARTICIPANTS[ticket.gameType] || 8
      const bonus = result.bonus && result.bonus > 0 ? result.bonus : 1
      let totalPayout = 0
      let isWinner = false

      const updatedBets = ticket.bets.map(bet => {
        const isWin = bet.second === undefined
          ? bet.first === result.first
          : bet.first === result.first && bet.second === result.second

        if (isWin) {
          isWinner = true
          let winOdds = 0
          let winAmount = 0
          if (result.odds) {
            const oddsIndex = getOddsIndex(bet, participants)
            const odd = result.odds[oddsIndex]
            if (odd && odd > 0) {
              winOdds = odd * bonus  // Apply bonus multiplier to winning odds
              winAmount = bet.amount * winOdds
              totalPayout += winAmount
            }
          }
          return { ...bet, isWinner: true, winOdds, winAmount }
        }
        return { ...bet, isWinner: false }
      })

      const newStatus: SalesStatus = isWinner ? 'win' : 'lost'

      console.log(`[useSalesTracker] Ticket ${ticket.ticketId} updated: ${ticket.status} -> ${newStatus}`)

      return {
        ...ticket,
        bets: updatedBets,
        status: newStatus,
        payout: totalPayout
      }
    }))
  }, [])

  // Convert tickets to SalesRecord format for Ventas component
  const salesRecords: SalesRecord[] = tickets.map(ticket => {
    // Format date/time
    const dt = ticket.createdAt
    const dateStr = `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')}/${dt.getFullYear()}`
    const timeStr = `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}:${dt.getSeconds().toString().padStart(2, '0')}`

    return {
      raceNumber: ticket.ticketId.slice(-4),
      dateTime: `${dateStr} ${timeStr}`,
      plays: ticket.bets.length,
      amount: ticket.totalAmount,
      investment: 0, // Original POS: inversión always 0
      payout: ticket.isPaid ? ticket.payout : 0, // Only show payout after scan/pay
      balance: 0, // Calculated below
      gameType: GAME_PREFIX_MAP[ticket.gamePrefix] || GAME_TYPE_MAP[ticket.gameType] || 'DOS',
      status: ticket.status
    }
  })

  // Calculate cumulative balance — matches original vendor POS:
  // pending=0, lost=+monto, won sin pagar=0, won pagado=+(monto-pago), cancelled=0
  let runningBalance = 0
  const reversedRecords = [...salesRecords].reverse()
  for (const record of reversedRecords) {
    if (record.status === 'cancelled' || record.status === 'pending') {
      record.balance = 0
      continue
    }
    if (record.status === 'lost') {
      runningBalance += record.amount
    } else if (record.status === 'win' && record.payout > 0) {
      runningBalance += record.amount - record.payout
    }
    // won sin pagar (payout === 0): no suma al balance
    record.balance = runningBalance
  }

  // Clear all tickets (for new session)
  const clearTickets = useCallback(() => {
    setTickets([])
    if (persistToStorage && typeof window !== 'undefined') {
      localStorage.removeItem(storageKey)
    }
  }, [persistToStorage, storageKey])

  /**
   * Replace the ticket list atomically. Used to hydrate from a resumed session
   * returned by SignalR Init (unclosed previous session). If called with an
   * empty array, behaves like clearTickets().
   */
  const replaceTickets = useCallback((next: CreatedTicket[]) => {
    setTickets(next)
    if (persistToStorage && typeof window !== 'undefined') {
      if (next.length === 0) {
        localStorage.removeItem(storageKey)
      } else {
        try {
          localStorage.setItem(storageKey, JSON.stringify(next))
        } catch (e) {
          console.warn('[useSalesTracker] Failed to persist replaced tickets:', e)
        }
      }
    }
  }, [persistToStorage, storageKey])

  // Clear tickets for today only
  const clearTodayTickets = useCallback(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    setTickets(prev => prev.filter(t => t.createdAt < today))
  }, [])

  // Mark a ticket as paid (after scan+confirm or autopay during balance)
  const markTicketPaid = useCallback((ticketId: string) => {
    setTickets(prev => prev.map(t =>
      t.ticketId === ticketId ? { ...t, isPaid: true } : t
    ))
  }, [])

  // Cancel a specific ticket by ticketId
  const cancelTicket = useCallback((ticketId: string) => {
    setTickets(prev => prev.map(t =>
      t.ticketId === ticketId ? { ...t, status: 'cancelled' as SalesStatus, payout: 0 } : t
    ))
  }, [])

  // Cancel all pending tickets (when connection is lost)
  const cancelPendingTickets = useCallback((reason: string = 'connection_lost') => {
    setTickets(prev => {
      const pendingTickets = prev.filter(t => t.status === 'pending')
      if (pendingTickets.length === 0) return prev

      console.log(`[useSalesTracker] Cancelling ${pendingTickets.length} pending tickets (reason: ${reason})`)

      return prev.map(ticket => {
        if (ticket.status === 'pending') {
          return {
            ...ticket,
            status: 'cancelled' as SalesStatus,
            payout: 0
          }
        }
        return ticket
      })
    })
  }, [])

  return {
    tickets,
    salesRecords,
    addTicket,
    addWalletMovement,
    updateTicketStatus,
    markTicketPaid,
    cancelTicket,
    clearTickets,
    replaceTickets,
    clearTodayTickets,
    cancelPendingTickets,
    ticketCount: tickets.length,
    pendingCount: tickets.filter(t => t.status === 'pending').length
  }
}
