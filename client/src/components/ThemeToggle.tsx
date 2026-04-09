import { useState, useRef, useEffect } from 'react'
import { useTheme, THEMES } from '../theme/ThemeContext'
import styles from './ThemeToggle.module.scss'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const current = THEMES.find((t) => t.id === theme)!

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        type="button"
        className={styles.btn}
        onClick={() => setOpen((v) => !v)}
        aria-label="Change theme"
        aria-expanded={open}
      >
        {current.label}
      </button>

      {open && (
        <div className={styles.menu}>
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`${styles.option} ${t.id === theme ? styles.active : ''}`}
              onClick={() => { setTheme(t.id); setOpen(false) }}
            >
              <span className={`${styles.swatch} ${styles[t.id]}`} />
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
