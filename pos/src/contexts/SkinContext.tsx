/**
 * SkinContext — global visual skin for the POS, independent of the per-game
 * theme (useGameTheme). Two skins:
 *   - 'classic' : the original POS look (navy blue + maroon). DEFAULT.
 *   - 'web'     : matches the web-lobby corporate identity (charcoal + gold).
 *
 * The skin is written as a `data-skin` attribute on <html>, which drives the
 * token overrides in index.css. It persists per device in localStorage so each
 * terminal remembers its choice. The default is 'classic' so existing
 * terminals are visually unchanged until someone opts in.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Skin = 'classic' | 'web'

const STORAGE_KEY = 'pos_skin'
const DEFAULT_SKIN: Skin = 'classic'

function readStoredSkin(): Skin {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'web' || v === 'classic' ? v : DEFAULT_SKIN
  } catch {
    return DEFAULT_SKIN
  }
}

/** Reflect the skin onto <html data-skin> so CSS token overrides apply. */
function applySkinAttribute(skin: Skin): void {
  document.documentElement.setAttribute('data-skin', skin)
}

interface SkinContextValue {
  skin: Skin
  setSkin: (skin: Skin) => void
  toggleSkin: () => void
}

const SkinContext = createContext<SkinContextValue | null>(null)

export function SkinProvider({ children }: { children: ReactNode }) {
  const [skin, setSkinState] = useState<Skin>(readStoredSkin)

  // Apply on mount and whenever the skin changes.
  useEffect(() => {
    applySkinAttribute(skin)
  }, [skin])

  const setSkin = useCallback((next: Skin) => {
    setSkinState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* storage may be unavailable (private mode); skin still applies for the session */
    }
  }, [])

  const toggleSkin = useCallback(() => {
    setSkinState((prev) => {
      const next: Skin = prev === 'web' ? 'classic' : 'web'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const value = useMemo<SkinContextValue>(
    () => ({ skin, setSkin, toggleSkin }),
    [skin, setSkin, toggleSkin],
  )

  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>
}

export function useSkin(): SkinContextValue {
  const ctx = useContext(SkinContext)
  if (!ctx) {
    throw new Error('useSkin must be used within a SkinProvider')
  }
  return ctx
}
