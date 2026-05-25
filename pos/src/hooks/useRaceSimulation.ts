/**
 * Race Simulation Hook
 * Simulates race data for demo/testing purposes
 * Supports async races: DOS+DOT sync, DOE independent, HOC independent
 */

import { useState, useEffect, useCallback } from 'react'

const RACE_DURATION = 60 // 1 minute per race for faster testing
const RACE_RUNNING_DURATION = 30 // 30 seconds of race running

// Race states
type RaceState = 'betting' | 'closing' | 'running'

// Game groups for async races
type GameGroup = 'dos_dot' | 'doe' | 'hoc'

interface GameRaceState {
  raceNumber: number
  countdown: number
  raceState: RaceState
  raceRunningTimer: number
  raceStartTime: string
}

interface RaceSimulationData {
  raceNumber: string
  countdown: number
  roundInterval: number
  serverTime: string
  raceStartTime: string
  raceState: RaceState
}

interface UseRaceSimulationReturn {
  data: RaceSimulationData
  getGameData: (game: string) => RaceSimulationData
  isSimulating: boolean
  startSimulation: () => void
  stopSimulation: () => void
}

/**
 * Format time as HH:MM:SS
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

/**
 * Get game group from game prefix
 */
function getGameGroup(game: string): GameGroup {
  if (game === 'dos' || game === 'dot') return 'dos_dot'
  if (game === 'doe') return 'doe'
  return 'hoc'
}

/**
 * Calculate race start time from countdown
 */
function calculateRaceStartTime(countdown: number): string {
  const start = new Date()
  start.setSeconds(start.getSeconds() + countdown)
  return formatTime(start)
}

/**
 * Initial state for a game group with offset for async simulation
 */
function createInitialGameState(offset: number): GameRaceState {
  const countdown = RACE_DURATION - offset
  return {
    raceNumber: 16,
    countdown: countdown > 0 ? countdown : RACE_DURATION + countdown,
    raceState: 'betting',
    raceRunningTimer: 0,
    raceStartTime: calculateRaceStartTime(countdown > 0 ? countdown : RACE_DURATION + countdown)
  }
}

/**
 * Hook that simulates race data with countdown, times, and race numbers
 * Supports async races per game group
 */
export function useRaceSimulation(enabled = true): UseRaceSimulationReturn {
  const [isSimulating, setIsSimulating] = useState(enabled)
  const [serverTime, setServerTime] = useState(() => formatTime(new Date()))

  // Independent states for each game group
  // DOS+DOT start at 0, DOE at 20s offset, HOC at 40s offset
  const [gameStates, setGameStates] = useState<Record<GameGroup, GameRaceState>>(() => ({
    dos_dot: createInitialGameState(0),
    doe: createInitialGameState(20),
    hoc: createInitialGameState(40)
  }))

  // Update server time every second
  useEffect(() => {
    if (!isSimulating) return

    const timer = setInterval(() => {
      setServerTime(formatTime(new Date()))
    }, 1000)

    return () => clearInterval(timer)
  }, [isSimulating])

  // Countdown timer with race states for all game groups
  useEffect(() => {
    if (!isSimulating) return

    const timer = setInterval(() => {
      setGameStates(prev => {
        const newStates = { ...prev }

        // Update each game group independently
        for (const group of ['dos_dot', 'doe', 'hoc'] as GameGroup[]) {
          const state = { ...newStates[group] }

          if (state.raceState === 'running') {
            // During race running, count the race duration
            state.raceRunningTimer += 1
            if (state.raceRunningTimer >= RACE_RUNNING_DURATION) {
              // Race finished, go back to betting
              state.raceNumber += 1
              state.raceState = 'betting'
              state.raceRunningTimer = 0
            }
            // Also decrement countdown for next race
            state.countdown = state.countdown > 0 ? state.countdown - 1 : state.countdown
          } else {
            // Countdown phase
            const newCountdown = state.countdown > 0 ? state.countdown - 1 : state.countdown

            // State transitions based on countdown
            if (state.raceState === 'betting' && newCountdown <= 5 && newCountdown > 0) {
              state.raceState = 'closing'
            } else if (state.raceState === 'closing' && newCountdown <= 0) {
              // Start race running - reset countdown for next race
              state.raceState = 'running'
              state.raceRunningTimer = 0
              state.raceStartTime = calculateRaceStartTime(RACE_DURATION)
              state.countdown = RACE_DURATION
            } else {
              state.countdown = newCountdown
            }
          }

          newStates[group] = state
        }

        return newStates
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isSimulating])

  const startSimulation = useCallback(() => {
    setIsSimulating(true)
    setGameStates({
      dos_dot: createInitialGameState(0),
      doe: createInitialGameState(20),
      hoc: createInitialGameState(40)
    })
  }, [])

  const stopSimulation = useCallback(() => {
    setIsSimulating(false)
  }, [])

  // Get data for a specific game
  const getGameData = useCallback((game: string): RaceSimulationData => {
    const group = getGameGroup(game)
    const state = gameStates[group]
    return {
      raceNumber: state.raceNumber.toString().padStart(4, '0'),
      countdown: state.countdown,
      roundInterval: RACE_DURATION, // Simulation uses 60s rounds
      serverTime,
      raceStartTime: state.raceStartTime,
      raceState: state.raceState
    }
  }, [gameStates, serverTime])

  // Default data (DOS/DOT group for backwards compatibility)
  const defaultData: RaceSimulationData = {
    raceNumber: gameStates.dos_dot.raceNumber.toString().padStart(4, '0'),
    countdown: gameStates.dos_dot.countdown,
    roundInterval: RACE_DURATION,
    serverTime,
    raceStartTime: gameStates.dos_dot.raceStartTime,
    raceState: gameStates.dos_dot.raceState
  }

  return {
    data: defaultData,
    getGameData,
    isSimulating,
    startSimulation,
    stopSimulation
  }
}

export default useRaceSimulation
