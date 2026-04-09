import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

export type Theme = 'light' | 'dark' | 'midnight' | 'amoled' | 'dracula' | 'nord' | 'forest' | 'sunset'

export const THEMES: { id: Theme; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'midnight', label: 'Midnight' },
  { id: 'amoled', label: 'AMOLED' },
  { id: 'dracula', label: 'Dracula' },
  { id: 'nord', label: 'Nord' },
  { id: 'forest', label: 'Forest' },
  { id: 'sunset', label: 'Sunset' },
]

const VALID_THEMES = new Set<string>(THEMES.map((t) => t.id))
const BASE_KEY = 'flashcards-theme'

function storageKey(userId?: string | null) {
  return userId ? `${BASE_KEY}-${userId}` : BASE_KEY
}

function readTheme(userId?: string | null): Theme {
  if (typeof window === 'undefined') return 'dark'
  const s = localStorage.getItem(storageKey(userId))
  return VALID_THEMES.has(s ?? '') ? (s as Theme) : 'dark'
}

const ThemeContext = createContext<{
  theme: Theme
  toggle: () => void
  setTheme: (t: Theme) => void
  syncUser: (userId: string | null) => void
} | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [theme, setThemeState] = useState<Theme>(() => readTheme())

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(storageKey(userId), theme)
  }, [theme, userId])

  const syncUser = useCallback((uid: string | null) => {
    setUserId(uid)
    setThemeState(readTheme(uid))
  }, [])

  const setTheme = useCallback((t: Theme) => setThemeState(t), [])
  const toggle = useCallback(
    () =>
      setThemeState((prev) => {
        const idx = THEMES.findIndex((t) => t.id === prev)
        return THEMES[(idx + 1) % THEMES.length].id
      }),
    []
  )

  const value = useMemo(
    () => ({ theme, toggle, setTheme, syncUser }),
    [theme, toggle, setTheme, syncUser]
  )

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
