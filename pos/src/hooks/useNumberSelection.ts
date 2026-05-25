import { useState, useCallback, useEffect, useRef } from 'react'

// Bet modes for DOT game
export type BetMode = 'exacta' | 'trifecta'
export type OrderMode = 'exact' | 'any'

interface UseNumberSelectionOptions {
  totalRunners: number
  activeGame: string
}

interface UseNumberSelectionReturn {
  selectedFirst: number[]
  selectedSecond: number[]
  selectedThird: number[]
  betMode: BetMode
  orderMode: OrderMode
  handleFirstSelect: (num: number) => void
  handleSecondSelect: (num: number) => void
  handleThirdSelect: (num: number) => void
  handleGemela: () => void
  handleContra: () => void
  handleTrio: () => void
  setBetMode: (mode: BetMode) => void
  setOrderMode: (mode: OrderMode) => void
  clearSelections: () => void
  setSelectedFirst: React.Dispatch<React.SetStateAction<number[]>>
  setSelectedSecond: React.Dispatch<React.SetStateAction<number[]>>
  setSelectedThird: React.Dispatch<React.SetStateAction<number[]>>
}

/**
 * Custom hook for managing number selections in first, second, and third rows
 * Supports both exacta (2 rows) and trifecta (3 rows) betting modes
 */
export function useNumberSelection({
  totalRunners,
  activeGame
}: UseNumberSelectionOptions): UseNumberSelectionReturn {
  const [selectedFirst, setSelectedFirst] = useState<number[]>([])
  const [selectedSecond, setSelectedSecond] = useState<number[]>([])
  const [selectedThird, setSelectedThird] = useState<number[]>([])
  const [betMode, setBetModeState] = useState<BetMode>('trifecta')
  const [orderMode, setOrderModeState] = useState<OrderMode>('exact')
  const prevGameRef = useRef(activeGame)

  // Clear selections when changing games
  useEffect(() => {
    if (prevGameRef.current !== activeGame) {
      prevGameRef.current = activeGame
      setSelectedFirst([])
      setSelectedSecond([])
      setSelectedThird([])
      // Reset to trifecta mode for DOT, exacta for others
      setBetModeState(activeGame === 'dot' ? 'trifecta' : 'exacta')
    }
  }, [activeGame])

  const handleFirstSelect = useCallback((num: number) => {
    setSelectedFirst(prev =>
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]
    )
  }, [])

  const handleSecondSelect = useCallback((num: number) => {
    setSelectedSecond(prev =>
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]
    )
  }, [])

  const handleThirdSelect = useCallback((num: number) => {
    setSelectedThird(prev =>
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]
    )
  }, [])

  // GEMELA: Copy 1° selection to 2° row
  const handleGemela = useCallback(() => {
    setSelectedFirst(prev => {
      if (prev.length > 0) {
        setSelectedSecond([...prev])
      }
      return prev
    })
  }, [])

  // CONTRA: Select all OTHER numbers in 2° except those in 1°
  const handleContra = useCallback(() => {
    setSelectedFirst(prev => {
      if (prev.length > 0) {
        const allNumbers = Array.from({ length: totalRunners }, (_, i) => i + 1)
        const contraNumbers = allNumbers.filter(n => !prev.includes(n))
        setSelectedSecond(contraNumbers)
      }
      return prev
    })
  }, [totalRunners])

  // TRÍO: Copy 1° and 2° selections to 3° (for trifecta betting)
  const handleTrio = useCallback(() => {
    setSelectedFirst(prev => {
      setSelectedSecond(second => {
        // Combine unique numbers from 1° and 2° into 3°
        const combined = [...new Set([...prev, ...second])]
        if (combined.length > 0) {
          setSelectedThird(combined)
        }
        return second
      })
      return prev
    })
  }, [])

  const setBetMode = useCallback((mode: BetMode) => {
    setBetModeState(mode)
    // Clear third row when switching to exacta
    if (mode === 'exacta') {
      setSelectedThird([])
    }
  }, [])

  const setOrderMode = useCallback((mode: OrderMode) => {
    setOrderModeState(mode)
  }, [])

  const clearSelections = useCallback(() => {
    setSelectedFirst([])
    setSelectedSecond([])
    setSelectedThird([])
  }, [])

  return {
    selectedFirst,
    selectedSecond,
    selectedThird,
    betMode,
    orderMode,
    handleFirstSelect,
    handleSecondSelect,
    handleThirdSelect,
    handleGemela,
    handleContra,
    handleTrio,
    setBetMode,
    setOrderMode,
    clearSelections,
    setSelectedFirst,
    setSelectedSecond,
    setSelectedThird
  }
}
