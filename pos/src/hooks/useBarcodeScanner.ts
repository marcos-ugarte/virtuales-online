import { useEffect, useRef, useCallback } from 'react'

interface UseBarcodeScannerOptions {
  /** Called with the scanned code when a complete scan is detected */
  onScan: (code: string) => void
  /** Minimum characters to consider a valid scan (default: 4) */
  minLength?: number
  /** Max milliseconds between keystrokes to be considered scanner input (default: 50) */
  maxDelay?: number
  /** Enable or disable the scanner detection (default: true) */
  enabled?: boolean
}

/** Tags where we should NOT intercept keystrokes (user is typing manually) */
const INTERACTIVE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/**
 * Detects barcode/QR scanner input via keyboard events.
 *
 * Barcode scanners emulate a keyboard: they type characters very fast
 * (< 50ms between keystrokes) and press Enter at the end.
 * This hook detects that pattern and calls `onScan` with the scanned string.
 *
 * It ignores input when the user is focused on a text field to avoid
 * intercepting normal typing.
 */
export function useBarcodeScanner({
  onScan,
  minLength = 4,
  maxDelay = 50,
  enabled = true,
}: UseBarcodeScannerOptions): void {
  const bufferRef = useRef<string>('')
  const lastKeystrokeRef = useRef<number>(0)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetBuffer = useCallback(() => {
    bufferRef.current = ''
    lastKeystrokeRef.current = 0
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in a form field
      const activeEl = document.activeElement
      if (activeEl && INTERACTIVE_TAGS.has(activeEl.tagName)) {
        resetBuffer()
        return
      }

      const now = Date.now()
      const timeSinceLast = now - lastKeystrokeRef.current

      // If too much time has passed since the last keystroke, start fresh
      if (lastKeystrokeRef.current > 0 && timeSinceLast > maxDelay) {
        resetBuffer()
      }

      if (event.key === 'Enter') {
        // Scanner sends Enter at the end of a scan
        if (bufferRef.current.length >= minLength) {
          // This looks like a scanner — prevent default form submission
          event.preventDefault()
          event.stopPropagation()

          const scannedCode = bufferRef.current
          resetBuffer()
          onScan(scannedCode)
        } else {
          // Too short to be a scan — let Enter pass through normally
          resetBuffer()
        }
        return
      }

      // Only buffer printable single characters (ignore Shift, Ctrl, etc.)
      if (event.key.length === 1) {
        lastKeystrokeRef.current = now
        bufferRef.current += event.key

        // Reset buffer after maxDelay if no more keys arrive
        if (resetTimerRef.current) {
          clearTimeout(resetTimerRef.current)
        }
        resetTimerRef.current = setTimeout(() => {
          resetBuffer()
        }, maxDelay * 2)
      }
    }

    // Use capture phase so we get the event before any other handler
    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      resetBuffer()
    }
  }, [enabled, minLength, maxDelay, onScan, resetBuffer])
}
