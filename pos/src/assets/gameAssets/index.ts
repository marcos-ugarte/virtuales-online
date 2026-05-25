/**
 * Game Assets Index
 * Provides lazy loading of game-specific assets
 */

import type { GameAssetBundle } from './dosAssets'

export type { GameAssetBundle }

// Cache for loaded assets
const assetCache = new Map<string, GameAssetBundle>()

// Preload queue
const preloadQueue = new Set<string>()

/**
 * Dynamically load assets for a specific game
 */
export async function loadGameAssets(game: 'dos' | 'doe' | 'hoc'): Promise<GameAssetBundle> {
  // Check cache first
  if (assetCache.has(game)) {
    return assetCache.get(game)!
  }

  // Dynamic import based on game
  let assets: GameAssetBundle

  switch (game) {
    case 'dos':
      const dosModule = await import('./dosAssets')
      assets = dosModule.dosAssets
      break
    case 'doe':
      const doeModule = await import('./doeAssets')
      assets = doeModule.doeAssets
      break
    case 'hoc':
      const hocModule = await import('./hocAssets')
      assets = hocModule.hocAssets
      break
    default:
      const defaultModule = await import('./dosAssets')
      assets = defaultModule.dosAssets
  }

  // Cache the loaded assets
  assetCache.set(game, assets)

  return assets
}

/**
 * Preload assets for a game in the background
 * Useful for preloading the next game while current one is active
 */
export function preloadGameAssets(game: 'dos' | 'doe' | 'hoc'): void {
  // Skip if already cached or in queue
  if (assetCache.has(game) || preloadQueue.has(game)) {
    return
  }

  preloadQueue.add(game)

  // Use requestIdleCallback if available, otherwise setTimeout
  const schedulePreload = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 100))

  schedulePreload(() => {
    loadGameAssets(game).finally(() => {
      preloadQueue.delete(game)
    })
  })
}

/**
 * Check if assets for a game are already loaded
 */
export function isGameAssetsLoaded(game: 'dos' | 'doe' | 'hoc'): boolean {
  return assetCache.has(game)
}

/**
 * Clear the asset cache (useful for memory management)
 */
export function clearAssetCache(): void {
  assetCache.clear()
}
