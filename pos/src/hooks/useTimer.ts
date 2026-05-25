import { useState, useEffect, useRef } from 'react'

const DEFAULT_ROUND_INTERVAL = 240 // 4 minutes default

interface UseTimerOptions {
  serverCountdown: number
  roundInterval?: number
}

interface UseTimerReturn {
  localCountdown: number
  timerProgress: number
}

/**
 * Custom hook for managing local countdown timer with server sync
 * Handles smooth countdown animation while staying synced with server
 */
export function useTimer({ serverCountdown, roundInterval = DEFAULT_ROUND_INTERVAL }: UseTimerOptions): UseTimerReturn {
  const [localCountdown, setLocalCountdown] = useState(0)
  const lastServerCountdown = useRef(0)

  // Sync with server when countdown changes significantly
  useEffect(() => {
    const diff = Math.abs(serverCountdown - lastServerCountdown.current)
    if (diff > 2 || serverCountdown > lastServerCountdown.current) {
      lastServerCountdown.current = serverCountdown
      // Use functional update to avoid dependency on localCountdown
      setLocalCountdown(() => serverCountdown)
    }
  }, [serverCountdown])

  // Local timer that decrements every second
  useEffect(() => {
    const timer = setInterval(() => {
      setLocalCountdown(prev => {
        if (prev <= 0) return 0
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Calculate progress based on roundInterval (100% at start, 0% when time runs out)
  const timerProgress = localCountdown > 0
    ? Math.max(0, Math.min(100, (localCountdown / roundInterval) * 100))
    : 0

  return {
    localCountdown,
    timerProgress
  }
}

export { DEFAULT_ROUND_INTERVAL }
