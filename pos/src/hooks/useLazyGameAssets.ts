/**
 * Lazy Game Assets Hook
 * Dynamically loads game-specific assets only when needed
 * Preloads other games in background for fast switching
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { loadGameAssets, preloadGameAssets, isGameAssetsLoaded, type GameAssetBundle } from '@/assets/gameAssets'

type GameKey = 'dos' | 'doe' | 'hoc'

// Default empty assets to prevent null checks
const EMPTY_ASSETS: GameAssetBundle = {
  background: '',
  selection: { row1: [], row2: [] },
  funcButtonBg: '',
  infoPanel: { shadow: '', highlight: '', bg: '' },
  coins: { coin25: '', coin50: '', coin100: '', coin200: '' },
  gameIcon: '',
  gameIconBg: '',
  runnerCount: 6
}

// Game order for preloading
const GAME_ORDER: GameKey[] = ['dos', 'doe', 'hoc']

interface UseLazyGameAssetsReturn {
  assets: GameAssetBundle
  isLoading: boolean
  isReady: boolean
  error: Error | null
}

/**
 * Hook that lazily loads assets for the active game
 * and preloads other games in background
 */
export function useLazyGameAssets(activeGame: string): UseLazyGameAssetsReturn {
  const [assets, setAssets] = useState<GameAssetBundle>(EMPTY_ASSETS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const loadedRef = useRef<Set<string>>(new Set())
  const mountedRef = useRef(true)

  // Normalize game key (DOT uses DOS assets)
  const gameKey: GameKey = activeGame === 'dot' ? 'dos' : (activeGame as GameKey)

  // Load assets for active game
  useEffect(() => {
    mountedRef.current = true

    const loadAssets = async () => {
      // Check if already loaded in cache
      if (isGameAssetsLoaded(gameKey) && loadedRef.current.has(gameKey)) {
        const cached = await loadGameAssets(gameKey)
        if (mountedRef.current) {
          setAssets(cached)
          setIsLoading(false)
        }
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const loadedAssets = await loadGameAssets(gameKey)
        if (mountedRef.current) {
          setAssets(loadedAssets)
          loadedRef.current.add(gameKey)
          setIsLoading(false)
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err : new Error('Failed to load assets'))
          setIsLoading(false)
        }
      }
    }

    loadAssets()

    return () => {
      mountedRef.current = false
    }
  }, [gameKey])

  // Preload other games in background after current game loads
  useEffect(() => {
    if (isLoading) return

    // Preload games that aren't the current one
    const otherGames = GAME_ORDER.filter(g => g !== gameKey)

    // Stagger preloading to avoid blocking
    otherGames.forEach((game, index) => {
      setTimeout(() => {
        preloadGameAssets(game)
      }, (index + 1) * 500) // 500ms between each preload
    })
  }, [gameKey, isLoading])

  const isReady = !isLoading && assets.background !== ''

  return {
    assets,
    isLoading,
    isReady,
    error
  }
}

/**
 * Preload a specific game's assets
 * Useful for preloading on hover or when anticipating game change
 */
export function usePreloadGame(): (game: GameKey) => void {
  return useCallback((game: GameKey) => {
    preloadGameAssets(game)
  }, [])
}

export default useLazyGameAssets
