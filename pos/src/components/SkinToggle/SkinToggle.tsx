/**
 * SkinToggle — discreet settings control to switch the POS visual skin between
 * 'classic' (original navy/maroon) and 'web' (web-lobby corporate look).
 * Rendered once at the App root, fixed in the bottom-left corner. The choice is
 * persisted per device by SkinContext (localStorage).
 */
import { useEffect, useRef, useState } from 'react'
import { useSkin, type Skin } from '@/contexts/SkinContext'
import styles from './SkinToggle.module.css'

const OPTIONS: { value: Skin; label: string; swatch: string }[] = [
  { value: 'classic', label: 'Clásico', swatch: styles.swatchClassic },
  { value: 'web', label: 'Web', swatch: styles.swatchWeb },
]

export default function SkinToggle() {
  const { skin, setSkin } = useSkin()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={styles.root} ref={rootRef}>
      {open && (
        <div className={styles.panel} role="menu" aria-label="Tema">
          <div className={styles.title}>Tema</div>
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`${styles.option} ${skin === opt.value ? styles.active : ''}`}
              onClick={() => {
                setSkin(opt.value)
                setOpen(false)
              }}
              role="menuitemradio"
              aria-checked={skin === opt.value}
            >
              <span className={`${styles.swatch} ${opt.swatch}`} />
              <span className={styles.label}>{opt.label}</span>
              {skin === opt.value && <span className={styles.check}>✓</span>}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        className={`${styles.gear} ${open ? styles.open : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Ajustes de tema"
        title="Ajustes de tema"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </div>
  )
}
