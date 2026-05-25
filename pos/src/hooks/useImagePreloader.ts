import { useState, useCallback } from 'react'

/**
 * Preloads an array of image URLs and tracks loading progress
 */
export function useImagePreloader(imageUrls: string[]) {
  const [loadedCount, setLoadedCount] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  const progress = imageUrls.length > 0
    ? Math.round((loadedCount / imageUrls.length) * 100)
    : 100

  const startPreloading = useCallback(() => {
    if (hasStarted || imageUrls.length === 0) return

    setHasStarted(true)
    let loaded = 0

    imageUrls.forEach((url) => {
      const img = new Image()

      const onLoad = () => {
        loaded++
        setLoadedCount(loaded)
        if (loaded === imageUrls.length) {
          setIsComplete(true)
        }
      }

      img.onload = onLoad
      img.onerror = onLoad // Count errors as loaded to not block
      img.src = url
    })
  }, [imageUrls, hasStarted])

  return {
    startPreloading,
    isComplete,
    progress,
    loadedCount,
    totalCount: imageUrls.length
  }
}

/**
 * List of critical images to preload for the Dashboard
 * These are imported at build time, so we have their resolved URLs
 */
export { DASHBOARD_IMAGES } from './dashboardImages'
