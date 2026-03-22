import { useEffect, useState } from 'react'
import type { FlashcardDraft, GroupMode } from '../types'
import { useGenerateAiMutation } from '../services/api'
import styles from './AiGeneratorModal.module.scss'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const LANGUAGES = [
  'English', 'Ukrainian', 'Spanish', 'French', 'German',
  'Italian', 'Portuguese', 'Polish', 'Japanese', 'Chinese',
  'Korean', 'Arabic', 'Turkish', 'Dutch', 'Swedish',
]

export function AiGeneratorModal({
  open,
  onClose,
  onApply,
  mode: initialMode = 'translation',
  frontLang: initialFrontLang = 'English',
  backLang: initialBackLang = 'Ukrainian',
}: {
  open: boolean
  onClose: () => void
  onApply: (cards: FlashcardDraft[], mode: GroupMode, frontLang: string, backLang: string) => void
  mode?: GroupMode
  frontLang?: string
  backLang?: string
}) {
  const [topic, setTopic] = useState('')
  const [englishLevel, setEnglishLevel] = useState('B1')
  const [count, setCount] = useState(8)
  const [preferences, setPreferences] = useState('')
  const [preview, setPreview] = useState<FlashcardDraft[] | null>(null)
  const [generate, { isLoading, error }] = useGenerateAiMutation()

  const [mode, setMode] = useState<GroupMode>(initialMode)
  const [frontLang, setFrontLang] = useState(initialFrontLang)
  const [backLang, setBackLang] = useState(initialBackLang)

  useEffect(() => {
    if (open) {
      setMode(initialMode)
      setFrontLang(initialFrontLang)
      setBackLang(initialBackLang)
    }
  }, [open, initialMode, initialFrontLang, initialBackLang])

  if (!open) return null

  function handleModeChange(newMode: GroupMode) {
    setMode(newMode)
    if (newMode === 'definition') {
      setBackLang(frontLang)
    } else if (backLang === frontLang) {
      setBackLang('Ukrainian')
    }
  }

  const modeLabel = mode === 'definition'
    ? `${frontLang} words with definitions`
    : `${frontLang} → ${backLang} translations`

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setPreview(null)
    try {
      const res = await generate({
        topic,
        englishLevel,
        count,
        mode,
        frontLang,
        backLang,
        preferences: preferences || undefined,
      }).unwrap()
      setPreview(res.flashcards)
    } catch {
      /* RTK sets error */
    }
  }

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.modalInner}>
        <div className={styles.head}>
          <h2 id="ai-title">Generate with AI</h2>
          <button type="button" className={styles.close} onClick={onClose}>
            ×
          </button>
        </div>
        <p className={styles.hint}>
          Powered by Google Gemini. Generating {modeLabel}.
        </p>
        <form className={styles.form} onSubmit={handleGenerate}>
          <div className={styles.modeRow}>
            <label className={styles.field}>
              <span>Mode</span>
              <select value={mode} onChange={(e) => handleModeChange(e.target.value as GroupMode)}>
                <option value="translation">Translation</option>
                <option value="definition">Definition</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>Front language</span>
              <select value={frontLang} onChange={(e) => setFrontLang(e.target.value)}>
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </label>
            {mode === 'translation' && (
              <label className={styles.field}>
                <span>Back language</span>
                <select value={backLang} onChange={(e) => setBackLang(e.target.value)}>
                  {LANGUAGES.filter((l) => l !== frontLang).map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <label className={styles.field}>
            <span>Topic</span>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. travel, business, daily life"
              required
            />
          </label>
          <label className={styles.field}>
            <span>{frontLang} level</span>
            <select
              value={englishLevel}
              onChange={(e) => setEnglishLevel(e.target.value)}
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Number of words</span>
            <input
              type="number"
              min={1}
              max={30}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </label>
          <label className={styles.field}>
            <span>Preferences (optional)</span>
            <input
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              placeholder="e.g. formal vocabulary, verbs only"
            />
          </label>
          {error && (
            <p className={styles.err}>
              {'data' in error && typeof (error as { data?: { error?: string } }).data?.error === 'string'
                ? (error as { data: { error: string } }).data.error
                : 'Could not generate. Check the server.'}
            </p>
          )}
          <button type="submit" className={styles.submit} disabled={isLoading}>
            {isLoading ? 'Generating…' : 'Generate'}
          </button>
        </form>

        {preview && preview.length > 0 && (
          <div className={styles.preview}>
            <h3>Preview ({preview.length})</h3>
            <ul className={styles.list}>
              {preview.slice(0, 8).map((c, i) => (
                <li key={i}>
                  <strong>{c.english}</strong>
                  <span className={styles.meta}>{c.back}</span>
                </li>
              ))}
              {preview.length > 8 && (
                <li className={styles.more}>+{preview.length - 8} more…</li>
              )}
            </ul>
            <div className={styles.previewActions}>
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  onApply(preview, mode, frontLang, backLang)
                  onClose()
                }}
              >
                Add to form
              </button>
              <button type="button" className={styles.ghost} onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
