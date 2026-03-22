import { useEffect, useRef, useState } from 'react'
import type { FlashcardDraft, GroupMode } from '../types'
import { useGenerateAiMutation, useGenerateFromPdfMutation } from '../services/api'
import styles from './AiGeneratorModal.module.scss'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const LANGUAGES = [
  'English', 'Ukrainian', 'Spanish', 'French', 'German',
  'Italian', 'Portuguese', 'Polish', 'Japanese', 'Chinese',
  'Korean', 'Arabic', 'Turkish', 'Dutch', 'Swedish',
]

type Source = 'topic' | 'pdf'

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
  const [source, setSource] = useState<Source>('topic')
  const [topic, setTopic] = useState('')
  const [englishLevel, setEnglishLevel] = useState('B1')
  const [count, setCount] = useState(8)
  const [preferences, setPreferences] = useState('')
  const [preview, setPreview] = useState<FlashcardDraft[] | null>(null)
  const [generate, { isLoading, error }] = useGenerateAiMutation()
  const [generatePdf, { isLoading: pdfLoading, error: pdfError }] = useGenerateFromPdfMutation()

  const [mode, setMode] = useState<GroupMode>(initialMode)
  const [frontLang, setFrontLang] = useState(initialFrontLang)
  const [backLang, setBackLang] = useState(initialBackLang)

  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfErr, setPdfErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setMode(initialMode)
      setFrontLang(initialFrontLang)
      setBackLang(initialBackLang)
      setPreview(null)
      setPdfFile(null)
      setPdfErr('')
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

  const busy = isLoading || pdfLoading
  const activeError = source === 'pdf' ? pdfError : error

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

  async function handlePdfGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!pdfFile) {
      setPdfErr('Please select a PDF file.')
      return
    }
    setPdfErr('')
    setPreview(null)
    const formData = new FormData()
    formData.append('pdf', pdfFile)
    formData.append('englishLevel', englishLevel)
    try {
      const res = await generatePdf(formData).unwrap()
      setPreview(res.flashcards)
    } catch {
      /* RTK sets error */
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      setPdfErr('Only PDF files are accepted.')
      setPdfFile(null)
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setPdfErr('File must be under 20 MB.')
      setPdfFile(null)
      return
    }
    setPdfErr('')
    setPdfFile(file)
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

        <div className={styles.sourceTabs}>
          <button
            type="button"
            className={source === 'topic' ? styles.sourceOn : styles.sourceTab}
            onClick={() => { setSource('topic'); setPreview(null) }}
          >
            By topic
          </button>
          <button
            type="button"
            className={source === 'pdf' ? styles.sourceOn : styles.sourceTab}
            onClick={() => { setSource('pdf'); setPreview(null) }}
          >
            From PDF
          </button>
        </div>

        {source === 'topic' && (
          <>
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
                    <option key={l} value={l}>{l}</option>
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
              {activeError && (
                <p className={styles.err}>
                  {'data' in activeError && typeof (activeError as { data?: { error?: string } }).data?.error === 'string'
                    ? (activeError as { data: { error: string } }).data.error
                    : 'Could not generate. Check the server.'}
                </p>
              )}
              <button type="submit" className={styles.submit} disabled={busy}>
                {isLoading ? 'Generating…' : 'Generate'}
              </button>
            </form>
          </>
        )}

        {source === 'pdf' && (
          <>
            <p className={styles.hint}>
              Upload a lesson PDF (exported from Miro, slides, etc.) and Gemini will extract vocabulary.
            </p>
            <form className={styles.form} onSubmit={handlePdfGenerate}>
              <label className={styles.field}>
                <span>English level</span>
                <select
                  value={englishLevel}
                  onChange={(e) => setEnglishLevel(e.target.value)}
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>PDF file</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className={styles.fileInput}
                />
              </label>
              {pdfFile && (
                <p className={styles.fileName}>{pdfFile.name} ({(pdfFile.size / 1024).toFixed(0)} KB)</p>
              )}
              {pdfErr && <p className={styles.err}>{pdfErr}</p>}
              {activeError && (
                <p className={styles.err}>
                  {'data' in activeError && typeof (activeError as { data?: { error?: string } }).data?.error === 'string'
                    ? (activeError as { data: { error: string } }).data.error
                    : 'Could not generate from PDF. Check the server.'}
                </p>
              )}
              <button type="submit" className={styles.submit} disabled={busy || !pdfFile}>
                {pdfLoading ? 'Analyzing PDF…' : 'Extract vocabulary'}
              </button>
            </form>
          </>
        )}

        {preview && preview.length > 0 && (
          <div className={styles.preview}>
            <h3>Preview ({preview.length})</h3>
            <ul className={styles.list}>
              {preview.slice(0, 8).map((c, i) => (
                <li key={i}>
                  <strong>{c.english}</strong>
                  {(c.pronunciation || c.partOfSpeech) && (
                    <span className={styles.detailLine}>
                      {c.pronunciation}
                      {c.pronunciation && c.partOfSpeech && ' · '}
                      {c.partOfSpeech}
                    </span>
                  )}
                  <span className={styles.meta}>{c.back}</span>
                  {c.exampleSentence && (
                    <span className={styles.exampleLine}>"{c.exampleSentence}"</span>
                  )}
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
