import { useState, useCallback, useRef } from 'react'
import type { Bet } from '@/types/bet'

interface LastBet {
  first: number[]
  second: number[]
  amount: number
}

type RuedaMode = null | 'rueda' | 'mediaRueda'

interface UseBetManagementOptions {
  activeGame: string
}

interface UseBetManagementReturn {
  bets: Bet[]
  nextBetId: number
  lastBet: LastBet | null
  selectedDenomination: number | null
  ruedaMode: RuedaMode
  addBet: (bet: Omit<Bet, 'id'>) => number
  /** Removes a single bet line by id (web-skin bet column individual delete). */
  removeBet: (id: number) => void
  clearBets: () => void
  /** Clears the pending bets of a specific game (not necessarily the active one).
   *  Used to wipe stale bets when that game's race starts — the cashier never
   *  got to print a ticket, so those bets are no longer valid. */
  clearBetsForGame: (game: string) => void
  setLastBet: React.Dispatch<React.SetStateAction<LastBet | null>>
  setSelectedDenomination: React.Dispatch<React.SetStateAction<number | null>>
  handleDenominationSelect: (
    value: number,
    selectedFirst: number[],
    selectedSecond: number[],
    totalRunners: number,
    onClearSelections: () => void,
    currentOdds?: number[]
  ) => void
  toggleRueda: () => void
  toggleMediaRueda: () => void
}

/**
 * Custom hook for managing bets, denominations, and Rueda (wheel) functionality.
 *
 * **State is partitioned per `activeGame`** — each game (dos, doe, dot, hoc)
 * keeps its own independent bet panel, selected denomination, rueda mode
 * and last-bet memory. Switching games does NOT clobber the previous game's
 * state, so the cashier can bet on DOS, switch to DOE, bet there, and
 * switch back to DOS to still see what was built up.
 *
 * R (Rueda) and R/2 (Media Rueda) work as MODES:
 * - Click R → stays highlighted (mode active)
 * - Click denomination while R is active → generates full wheel:
 *   selected runner as 1st vs ALL others as 2nd, AND all others as 1st vs selected as 2nd
 * - R/2 is the same but at half the denomination (rounded to valid coin, min $25)
 *
 * Verified against original POS: R with runner 1 in DOE (8 runners) = 14 bets (7+7 both directions)
 */
function lookupOdds(first: number, second: number | undefined, participants: number, odds?: number[]): number {
  if (!odds) return 0
  let idx: number
  if (second == null || second <= 0) {
    idx = first - 1
  } else {
    const factor = participants - 1
    const offset = second > first ? 1 : 0
    idx = first * factor + second - offset
  }
  const val = odds[idx]
  return val != null && val > 0 ? val : 0
}

export function useBetManagement({ activeGame }: UseBetManagementOptions): UseBetManagementReturn {
  // All state maps: key = activeGame code (e.g. "dos", "doe", "dot", "hoc").
  const [betsByGame, setBetsByGame] = useState<Record<string, Bet[]>>({})
  const [lastBetByGame, setLastBetByGame] = useState<Record<string, LastBet | null>>({})
  const [selectedDenominationByGame, setSelectedDenominationByGame] = useState<Record<string, number | null>>({})
  const [ruedaModeByGame, setRuedaModeByGame] = useState<Record<string, RuedaMode>>({})
  // Bet IDs are unique across games to avoid any collision in downstream processing.
  const nextBetIdRef = useRef(1)
  const [nextBetIdForEffect, setNextBetIdForEffect] = useState(1)

  // Derived slices for the currently-active game.
  const bets = betsByGame[activeGame] ?? []
  const lastBet = lastBetByGame[activeGame] ?? null
  const selectedDenomination = selectedDenominationByGame[activeGame] ?? null
  const ruedaMode = ruedaModeByGame[activeGame] ?? null

  // Helpers: update a slice of the per-game state for the active game.
  const updateBets = useCallback((updater: (prev: Bet[]) => Bet[]) => {
    setBetsByGame(prev => ({ ...prev, [activeGame]: updater(prev[activeGame] ?? []) }))
  }, [activeGame])

  const consumeNextId = useCallback(() => {
    const id = nextBetIdRef.current
    nextBetIdRef.current = id + 1
    setNextBetIdForEffect(nextBetIdRef.current)
    return id
  }, [])

  const addBet = useCallback((bet: Omit<Bet, 'id'>) => {
    const id = consumeNextId()
    updateBets(prev => [...prev, { ...bet, id }])
    return id
  }, [consumeNextId, updateBets])

  const removeBet = useCallback((id: number) => {
    updateBets(prev => prev.filter(b => b.id !== id))
  }, [updateBets])

  const clearBets = useCallback(() => {
    setBetsByGame(prev => ({ ...prev, [activeGame]: [] }))
    setSelectedDenominationByGame(prev => ({ ...prev, [activeGame]: null }))
    setRuedaModeByGame(prev => ({ ...prev, [activeGame]: null }))
  }, [activeGame])

  const clearBetsForGame = useCallback((game: string) => {
    setBetsByGame(prev => {
      // Skip the update (and the re-render) if this game already has nothing.
      if (!prev[game] || prev[game].length === 0) return prev
      return { ...prev, [game]: [] }
    })
    setSelectedDenominationByGame(prev => (prev[game] == null ? prev : { ...prev, [game]: null }))
    setRuedaModeByGame(prev => (prev[game] == null ? prev : { ...prev, [game]: null }))
  }, [])

  const setLastBet: React.Dispatch<React.SetStateAction<LastBet | null>> = useCallback((value) => {
    setLastBetByGame(prev => {
      const current = prev[activeGame] ?? null
      const next = typeof value === 'function' ? (value as (p: LastBet | null) => LastBet | null)(current) : value
      return { ...prev, [activeGame]: next }
    })
  }, [activeGame])

  const setSelectedDenomination: React.Dispatch<React.SetStateAction<number | null>> = useCallback((value) => {
    setSelectedDenominationByGame(prev => {
      const current = prev[activeGame] ?? null
      const next = typeof value === 'function' ? (value as (p: number | null) => number | null)(current) : value
      return { ...prev, [activeGame]: next }
    })
  }, [activeGame])

  const setRuedaMode = useCallback((value: RuedaMode | ((prev: RuedaMode) => RuedaMode)) => {
    setRuedaModeByGame(prev => {
      const current = prev[activeGame] ?? null
      const next = typeof value === 'function' ? (value as (p: RuedaMode) => RuedaMode)(current) : value
      return { ...prev, [activeGame]: next }
    })
  }, [activeGame])

  // Helper: create bets from first × second arrays at given amount
  const createBets = useCallback((first: number[], second: number[], amount: number, participants?: number, currentOdds?: number[]) => {
    const newBets: Bet[] = []

    if (second.length > 0) {
      for (const f of first) {
        for (const s of second) {
          if (f !== s) {
            newBets.push({ id: consumeNextId(), first: f, second: s, amount, odds: lookupOdds(f, s, participants || 8, currentOdds) })
          }
        }
      }
    } else {
      for (const f of first) {
        newBets.push({ id: consumeNextId(), first: f, amount, odds: lookupOdds(f, undefined, participants || 8, currentOdds) })
      }
    }

    updateBets(prev => [...prev, ...newBets])
    return newBets.length
  }, [consumeNextId, updateBets])

  // Helper: create full wheel (Rueda) bets — both directions
  const createRuedaBets = useCallback((selectedRunners: number[], totalRunners: number, amount: number, currentOdds?: number[]) => {
    const newBets: Bet[] = []
    const allRunners = Array.from({ length: totalRunners }, (_, i) => i + 1)

    for (const selected of selectedRunners) {
      // Forward: selected as 1st, all others as 2nd
      for (const other of allRunners) {
        if (other !== selected) {
          newBets.push({ id: consumeNextId(), first: selected, second: other, amount, odds: lookupOdds(selected, other, totalRunners, currentOdds) })
        }
      }
      // Reverse: all others as 1st, selected as 2nd
      for (const other of allRunners) {
        if (other !== selected) {
          newBets.push({ id: consumeNextId(), first: other, second: selected, amount, odds: lookupOdds(other, selected, totalRunners, currentOdds) })
        }
      }
    }

    updateBets(prev => [...prev, ...newBets])
    return newBets.length
  }, [consumeNextId, updateBets])

  const handleDenominationSelect = useCallback((
    value: number,
    selectedFirst: number[],
    selectedSecond: number[],
    totalRunners: number,
    onClearSelections: () => void,
    currentOdds?: number[]
  ) => {
    // Rueda mode: generate full wheel from selected runners
    if (ruedaMode && selectedFirst.length > 0) {
      const amount = ruedaMode === 'mediaRueda' ? value / 2 : value
      createRuedaBets(selectedFirst, totalRunners, amount, currentOdds)
      onClearSelections()
      setRuedaMode(null)
      setSelectedDenomination(null)
      return
    }

    // Normal bet creation
    if (selectedFirst.length > 0) {
      createBets(selectedFirst, selectedSecond, value, totalRunners, currentOdds)
      setLastBet({ first: [...selectedFirst], second: [...selectedSecond], amount: value })
      onClearSelections()
      setSelectedDenomination(null)
    } else {
      setSelectedDenomination(prev => value === prev ? null : value)
    }
  }, [ruedaMode, createBets, createRuedaBets, setRuedaMode, setSelectedDenomination, setLastBet])

  const toggleRueda = useCallback(() => {
    setRuedaMode(prev => prev === 'rueda' ? null : 'rueda')
  }, [setRuedaMode])

  const toggleMediaRueda = useCallback(() => {
    setRuedaMode(prev => prev === 'mediaRueda' ? null : 'mediaRueda')
  }, [setRuedaMode])

  return {
    bets,
    nextBetId: nextBetIdForEffect,
    lastBet,
    selectedDenomination,
    ruedaMode,
    addBet,
    removeBet,
    clearBets,
    clearBetsForGame,
    setLastBet,
    setSelectedDenomination,
    handleDenominationSelect,
    toggleRueda,
    toggleMediaRueda
  }
}
