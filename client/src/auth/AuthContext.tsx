import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { flashcardsApi } from '../services/api'
import { store } from '../app/store'

const TOKEN_KEY = 'flashcards-token'
const USER_KEY = 'flashcards-user'

const API_URL = import.meta.env.VITE_API_URL ?? ''

export interface AuthUser {
  id: string
  email: string
  name: string | null
  picture: string | null
}

interface AuthCtx {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: (googleCredential: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY)
  )
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(USER_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) {
      setUser(null)
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      return
    }

    let cancelled = false
    fetch(`${API_URL}/api/auth/me`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error('invalid')
        return r.json()
      })
      .then((u: AuthUser) => {
        if (!cancelled) {
          setUser(u)
          localStorage.setItem(USER_KEY, JSON.stringify(u))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setToken(null)
          setUser(null)
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(USER_KEY)
        }
      })

    return () => { cancelled = true }
  }, [token])

  const login = useCallback(async (credential: string) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Login failed')
      }
      const data = await res.json() as { token: string; user: AuthUser }
      store.dispatch(flashcardsApi.util.resetApiState())
      setToken(data.token)
      setUser(data.user)
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    } finally {
      setLoading(false)
    }
  }, [API_URL])

  const logout = useCallback(() => {
    store.dispatch(flashcardsApi.util.resetApiState())
    setToken(null)
    setUser(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }, [])

  const value = useMemo(
    () => ({ user, token, loading, login, logout }),
    [user, token, loading, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
