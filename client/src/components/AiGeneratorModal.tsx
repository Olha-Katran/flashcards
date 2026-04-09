import { useEffect, useRef, useState } from 'react'
import { FiRefreshCw } from 'react-icons/fi'
import type { FlashcardDraft, GroupMode } from '../types'
import { useGenerateAiMutation, useGenerateFromPdfMutation, useRegenerateOneMutation } from '../services/api'
import { LEVELS, LANGUAGES } from '../constants'
import { useEnglishLevel } from '../hooks/useEnglishLevel'
import { LoaderDots } from './LoaderDots'
import styles from './AiGeneratorModal.module.scss'

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
  const { level: userLevel } = useEnglishLevel()
  const [source, setSource] = useState<Source>('topic')
  const [topic, setTopic] = useState('')
  const [englishLevel, setEnglishLevel] = useState(userLevel)
  const [count, setCount] = useState(8)
  const [preferences, setPreferences] = useState('')
  const [preview, setPreview] = useState<FlashcardDraft[] | null>(null)
  const [generate, { isLoading, error }] = useGenerateAiMutation()
  const [generatePdf, { isLoading: pdfLoading, error: pdfError }] = useGenerateFromPdfMutation()
  const [regenerateOne] = useRegenerateOneMutation()

  const [mode, setMode] = useState<GroupMode>(initialMode)
  const [frontLang, setFrontLang] = useState(initialFrontLang)
  const [backLang, setBackLang] = useState(initialBackLang)

  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfErr, setPdfErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [rollingIdx, setRollingIdx] = useState<number | null>(null)

  useEffect(() => {
    if (open) {
      setMode(initialMode)
      setFrontLang(initialFrontLang)
      setBackLang(initialBackLang)
      setEnglishLevel(userLevel)
      setPreview(null)
      setPdfFile(null)
      setPdfErr('')
      setRollingIdx(null)
    }
  }, [open, initialMode, initialFrontLang, initialBackLang, userLevel])

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

  async function handleGenerate(e?: React.FormEvent) {
    e?.preventDefault()
    setPreview(null)
    setRollingIdx(null)
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

  async function handleRegenerateAll() {
    if (!preview) return
    const exclude = preview.map((c) => c.english)
    setPreview(null)
    setRollingIdx(null)
    try {
      const res = await generate({
        topic,
        englishLevel,
        count,
        mode,
        frontLang,
        backLang,
        preferences: preferences || undefined,
        exclude,
      }).unwrap()
      setPreview(res.flashcards)
    } catch {
      /* RTK sets error */
    }
  }

  async function handleRegenerateCard(idx: number) {
    if (!preview || rollingIdx !== null) return
    setRollingIdx(idx)
    try {
      const exclude = preview.map((c) => c.english)
      const res = await regenerateOne({
        topic,
        englishLevel,
        mode,
        frontLang,
        backLang,
        exclude,
      }).unwrap()
      setPreview((prev) =>
        prev ? prev.map((c, i) => (i === idx ? res.card : c)) : prev
      )
    } catch {
      /* ignore — card stays the same */
    } finally {
      setRollingIdx(null)
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
    setRollingIdx(null)
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

  const showForm = !preview
  const showPreview = preview && preview.length > 0

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

          {showForm && (
            <>
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
                        onChange={(e) => setEnglishLevel(e.target.value as typeof englishLevel)}
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
                      {isLoading ? <><LoaderDots size="sm" /> Generating</> : 'Generate'}
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
                        onChange={(e) => setEnglishLevel(e.target.value as typeof englishLevel)}
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
                      {pdfLoading ? <><LoaderDots size="sm" /> Analyzing PDF</> : 'Extract vocabulary'}
                    </button>
                  </form>
                </>
              )}
            </>
          )}

          {showPreview && (
            <div className={styles.preview}>
              <div className={styles.previewHead}>
                <h3>Generated cards ({preview.length})</h3>
                <button
                  type="button"
                  className={styles.rerollAll}
                  onClick={handleRegenerateAll}
                  disabled={busy}
                >
                  <FiRefreshCw size={14} />
                  {isLoading ? <><LoaderDots size="sm" /> Regenerating</> : 'Regenerate all'}
                </button>
              </div>
              <ul className={styles.list}>
                {preview.map((c, i) => (
                  <li key={i} className={rollingIdx === i ? styles.cardRolling : undefined}>
                    <div className={styles.cardHead}>
                      <strong>{c.english}</strong>
                      <button
                        type="button"
                        className={styles.rerollBtn}
                        onClick={() => handleRegenerateCard(i)}
                        disabled={rollingIdx !== null || busy}
                        title="Regenerate this card"
                      >
                        {rollingIdx === i ? <LoaderDots size="sm" /> : <FiRefreshCw size={13} />}
                      </button>
                    </div>
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
                <button
                  type="button"
                  className={styles.ghost}
                  onClick={() => setPreview(null)}
                >
                  Back to settings
                </button>
              </div>
            </div>
          )}
          {busy && (
            <div className={styles.loadingOverlay}>
              <LoaderDots />
              <span className={styles.loadingLabel}>
                {pdfLoading ? 'Analyzing PDF' : isLoading && preview ? 'Regenerating cards' : 'Generating cards'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
