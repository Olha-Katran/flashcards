import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { LEVELS, type EnglishLevel } from '../constants'

export { LEVELS, type EnglishLevel }

const BASE_KEY = 'flashcards-english-level'
const DEFAULT_LEVEL: EnglishLevel = 'B1'

function storageKey(userId?: string | null) {
  return userId ? `${BASE_KEY}-${userId}` : BASE_KEY
}

function read(userId?: string | null): EnglishLevel {
  const s = localStorage.getItem(storageKey(userId))
  return LEVELS.includes(s as EnglishLevel) ? (s as EnglishLevel) : DEFAULT_LEVEL
}

export function useEnglishLevel() {
  const { user } = useAuth()
  const [level, setLevelState] = useState<EnglishLevel>(() => read(user?.id))

  useEffect(() => {
    setLevelState(read(user?.id))
  }, [user?.id])

  const setLevel = useCallback(
    (l: EnglishLevel) => {
      setLevelState(l)
      localStorage.setItem(storageKey(user?.id), l)
    },
    [user?.id]
  )

  return { level, setLevel }
}
