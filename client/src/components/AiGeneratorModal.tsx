import { useEffect, useRef, useState } from 'react'
import { FiRefreshCw, FiUpload } from 'react-icons/fi'
import type { ContentKind, FlashcardDraft, GroupMode } from '../types'
import sourceIconImage from '../assets/sourceType/Lifestyle Tritone Icons.svg'
import sourceIconTopic from '../assets/sourceType/Tritone Icons Collection.svg'
import sourceIconPdf from '../assets/sourceType/Vercel Security Checkpoint.svg'
import { useGenerateAiMutation, useGenerateFromImageMutation, useGenerateFromPdfMutation, useRegenerateOneMutation } from '../services/api'
import { LEVELS, LANGUAGES } from '../constants'
import { useEnglishLevel } from '../hooks/useEnglishLevel'
import { LoaderDots } from './LoaderDots'
import styles from './AiGeneratorModal.module.scss'

type Source = 'topic' | 'pdf' | 'image'

function wordCountForApi(raw: string): number {
  const n = parseInt(raw.trim(), 10)
  if (Number.isNaN(n)) return 8
  return Math.min(30, Math.max(1, n))
}

export function AiGeneratorModal({
  open,
  onClose,
  onApply,
  mode: initialMode = 'translation',
  contentKind: initialContentKind = 'vocabulary',
  frontLang: initialFrontLang = 'English',
  backLang: initialBackLang = 'Ukrainian',
}: {
  open: boolean
  onClose: () => void
  onApply: (cards: FlashcardDraft[], mode: GroupMode, frontLang: string, backLang: string, contentKind: ContentKind) => void
  mode?: GroupMode
  contentKind?: ContentKind
  frontLang?: string
  backLang?: string
}) {
  const { level: userLevel } = useEnglishLevel()
  const [contentKind, setContentKind] = useState<ContentKind>(initialContentKind)
  const [source, setSource] = useState<Source>('topic')
  const [topic, setTopic] = useState('')
  const [englishLevel, setEnglishLevel] = useState(userLevel)
  const [countInput, setCountInput] = useState('8')
  const [preferences, setPreferences] = useState('')
  const [preview, setPreview] = useState<FlashcardDraft[] | null>(null)
  const [generate, { isLoading, error }] = useGenerateAiMutation()
  const [generatePdf, { isLoading: pdfLoading, error: pdfError }] = useGenerateFromPdfMutation()
  const [generateImage, { isLoading: imageLoading, error: imageError }] = useGenerateFromImageMutation()
  const [regenerateOne] = useRegenerateOneMutation()

  const [mode, setMode] = useState<GroupMode>(initialMode)
  const [frontLang, setFrontLang] = useState(initialFrontLang)
  const [backLang, setBackLang] = useState(initialBackLang)

  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfErr, setPdfErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageErr, setImageErr] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [rollingIdx, setRollingIdx] = useState<number | null>(null)

  useEffect(() => {
    if (open) {
      setContentKind(initialContentKind)
      setMode(initialMode)
      setFrontLang(initialContentKind === 'phrasal_verbs' ? 'English' : initialFrontLang)
      setBackLang(initialBackLang)
      setEnglishLevel(userLevel)
      setPreview(null)
      setPdfFile(null)
      setPdfErr('')
      setImageFile(null)
      setImageErr('')
      setDragOver(false)
      setRollingIdx(null)
    }
  }, [open, initialMode, initialContentKind, initialFrontLang, initialBackLang, userLevel])

  useEffect(() => {
    if (!open || contentKind !== 'vocabulary' || source !== 'image') return
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.kind !== 'file') continue
        const file = item.getAsFile()
        if (!file) continue
        if (!isSupportedImage(file)) continue
        e.preventDefault()
        setImageFromFile(file)
        return
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [open, contentKind, source])

  if (!open) return null

  function handleModeChange(newMode: GroupMode) {
    setMode(newMode)
    if (newMode === 'definition') {
      setBackLang(frontLang)
    } else if (backLang === frontLang) {
      setBackLang('Ukrainian')
    }
  }

  function handleContentKindChange(ck: ContentKind) {
    setContentKind(ck)
    setPreview(null)
    setRollingIdx(null)
    if (ck === 'phrasal_verbs') {
      setEnglishLevel(userLevel)
      setFrontLang('English')
      setSource('topic')
      if (mode === 'translation') setBackLang('Ukrainian')
    }
  }

  function handleSourceChange(next: Source) {
    setSource(next)
    setPreview(null)
    setRollingIdx(null)
    setPdfErr('')
    setImageErr('')
    if (next !== 'pdf') setPdfFile(null)
    if (next !== 'image') setImageFile(null)
  }

  const modeLabel =
    contentKind === 'phrasal_verbs'
      ? mode === 'definition'
        ? 'English phrasal verbs with definitions'
        : `English phrasal verbs → ${backLang} translations`
      : mode === 'definition'
        ? `${frontLang} words with definitions`
        : `${frontLang} → ${backLang} translations`

  const busy = isLoading || pdfLoading || imageLoading
  const activeError = source === 'pdf' ? pdfError : source === 'image' ? imageError : error

  async function handleGenerate(e?: React.FormEvent) {
    e?.preventDefault()
    setPreview(null)
    setRollingIdx(null)
    try {
      const res = await generate({
        topic,
        englishLevel,
        count: wordCountForApi(countInput),
        mode,
        contentKind,
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
        count: wordCountForApi(countInput),
        mode,
        contentKind,
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
        contentKind,
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

  async function handleImageGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!imageFile) {
      setImageErr('Please select an image.')
      return
    }
    setImageErr('')
    setPreview(null)
    setRollingIdx(null)
    const formData = new FormData()
    formData.append('image', imageFile)
    formData.append('englishLevel', englishLevel)
    try {
      const res = await generateImage(formData).unwrap()
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

  function isSupportedImage(file: File): boolean {
    return file.type === 'image/png' || file.type === 'image/jpeg'
  }

  function setImageFromFile(file: File) {
    if (!isSupportedImage(file)) {
      setImageErr('Only PNG and JPG images are accepted.')
      setImageFile(null)
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageErr('Image must be under 5 MB.')
      setImageFile(null)
      return
    }
    setImageErr('')
    setImageFile(file)
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
              <div className={styles.sourceTabs} role="group" aria-label="Card type">
                <button
                  type="button"
                  className={contentKind === 'vocabulary' ? styles.sourceOn : styles.sourceTab}
                  onClick={() => handleContentKindChange('vocabulary')}
                >
                  Vocabulary
                </button>
                <button
                  type="button"
                  className={contentKind === 'phrasal_verbs' ? styles.sourceOn : styles.sourceTab}
                  onClick={() => handleContentKindChange('phrasal_verbs')}
                >
                  Phrasal verbs
                </button>
              </div>

              {contentKind === 'vocabulary' && (
                <div className={styles.sourceCards} role="group" aria-label="Source">
                  <button
                    type="button"
                    className={[
                      styles.sourceCard,
                      source === 'topic' ? styles.sourceCardOn : '',
                    ].join(' ')}
                    onClick={() => handleSourceChange('topic')}
                  >
                    <span className={styles.sourceCardIcon}>
                      <img src={sourceIconTopic} alt="" className={styles.sourceCardIconImg} decoding="async" />
                    </span>
                    <span className={styles.sourceCardTitle}>Topic</span>
                    <span className={styles.sourceCardSub}>Based on selected topic</span>
                  </button>
                  <button
                    type="button"
                    className={[
                      styles.sourceCard,
                      source === 'pdf' ? styles.sourceCardOn : '',
                    ].join(' ')}
                    onClick={() => handleSourceChange('pdf')}
                  >
                    <span className={styles.sourceCardIcon}>
                      <img src={sourceIconPdf} alt="" className={styles.sourceCardIconImg} decoding="async" />
                    </span>
                    <span className={styles.sourceCardTitle}>PDF</span>
                    <span className={styles.sourceCardSub}>Extract from uploaded document</span>
                  </button>
                  <button
                    type="button"
                    className={[
                      styles.sourceCard,
                      source === 'image' ? styles.sourceCardOn : '',
                    ].join(' ')}
                    onClick={() => handleSourceChange('image')}
                  >
                    <span className={styles.sourceCardIcon}>
                      <img src={sourceIconImage} alt="" className={styles.sourceCardIconImg} decoding="async" />
                    </span>
                    <span className={styles.sourceCardTitle}>Image</span>
                    <span className={styles.sourceCardSub}>Extract from an uploaded image</span>
                  </button>
                </div>
              )}

              {(contentKind === 'phrasal_verbs' || source === 'topic') && (
                <>
                  <p className={styles.hint}>
                    {contentKind === 'phrasal_verbs'
                      ? `Powered by OpenAI. ${modeLabel}. Topic can be a theme or a base verb (e.g. put, call). Verbs with several meanings may appear as separate cards: take down (1), take down (2), …`
                      : `Powered by OpenAI. Generating ${modeLabel}.`}
                  </p>
                  <form className={styles.form} onSubmit={handleGenerate}>
                    <div className={styles.modeRow}>
                      <label className={styles.field}>
                        <span>Mode</span>
                        <select
                          id="ai-gen-topic-mode"
                          name="mode"
                          value={mode}
                          onChange={(e) => handleModeChange(e.target.value as GroupMode)}
                        >
                          <option value="translation">Translation</option>
                          <option value="definition">Definition</option>
                        </select>
                      </label>
                      {contentKind === 'vocabulary' ? (
                        <>
                          <label className={styles.field}>
                            <span>Front language</span>
                            <select
                              id="ai-gen-topic-front-lang"
                              name="frontLang"
                              value={frontLang}
                              onChange={(e) => setFrontLang(e.target.value)}
                            >
                              {LANGUAGES.map((l) => (
                                <option key={l} value={l}>{l}</option>
                              ))}
                            </select>
                          </label>
                          {mode === 'translation' && (
                            <label className={styles.field}>
                              <span>Back language</span>
                              <select
                                id="ai-gen-topic-back-lang"
                                name="backLang"
                                value={backLang}
                                onChange={(e) => setBackLang(e.target.value)}
                              >
                                {LANGUAGES.filter((l) => l !== frontLang).map((l) => (
                                  <option key={l} value={l}>{l}</option>
                                ))}
                              </select>
                            </label>
                          )}
                        </>
                      ) : (
                        <>
                          {mode === 'translation' && (
                            <label className={styles.field}>
                              <span>Back language</span>
                              <select
                                id="ai-gen-topic-back-lang"
                                name="backLang"
                                value={backLang}
                                onChange={(e) => setBackLang(e.target.value)}
                              >
                                {LANGUAGES.filter((l) => l !== 'English').map((l) => (
                                  <option key={l} value={l}>{l}</option>
                                ))}
                              </select>
                            </label>
                          )}
                        </>
                      )}
                    </div>
                    <label className={styles.field}>
                      <span>{contentKind === 'phrasal_verbs' ? 'Topic or base verb' : 'Topic'}</span>
                      <input
                        id="ai-gen-topic"
                        name="topic"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder={
                          contentKind === 'phrasal_verbs'
                            ? 'e.g. travel, emotions, or put · call · get'
                            : 'e.g. travel, business, daily life'
                        }
                        required
                      />
                    </label>
                    <label className={styles.field}>
                      <span>
                        {contentKind === 'phrasal_verbs' ? 'English level' : `${frontLang} level`}
                      </span>
                      <select
                        id="ai-gen-topic-english-level"
                        name="englishLevel"
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
                        id="ai-gen-topic-count"
                        name="count"
                        type="number"
                        min={1}
                        max={30}
                        inputMode="numeric"
                        value={countInput}
                        onChange={(e) => {
                          const v = e.target.value
                          if (v === '') {
                            setCountInput('')
                            return
                          }
                          const n = Number(v)
                          if (!Number.isFinite(n)) return
                          if (n > 30) {
                            setCountInput('30')
                            return
                          }
                          setCountInput(v)
                        }}
                        onBlur={() => {
                          if (countInput === '') {
                            setCountInput('8')
                            return
                          }
                          setCountInput(String(wordCountForApi(countInput)))
                        }}
                      />
                    </label>
                    <label className={styles.field}>
                      <span>Preferences (optional)</span>
                      <input
                        id="ai-gen-topic-preferences"
                        name="preferences"
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

              {contentKind === 'vocabulary' && source === 'pdf' && (
                <>
                  <p className={styles.hint}>
                    Upload a lesson PDF (exported from Miro, slides, etc.) and the AI will extract vocabulary.
                  </p>
                  <form className={styles.form} onSubmit={handlePdfGenerate}>
                    <label className={styles.field}>
                      <span>English level</span>
                      <select
                        id="ai-gen-pdf-english-level"
                        name="englishLevel"
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
                        id="ai-gen-pdf-file"
                        name="pdf"
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

              {contentKind === 'vocabulary' && source === 'image' && (
                <>
                  <p className={styles.hint}>
                    Extract vocabulary from an uploaded image (OCR).
                  </p>
                  <form className={styles.form} onSubmit={handleImageGenerate}>
                    <label className={styles.field}>
                      <span>English level</span>
                      <select
                        id="ai-gen-image-english-level"
                        name="englishLevel"
                        value={englishLevel}
                        onChange={(e) => setEnglishLevel(e.target.value as typeof englishLevel)}
                      >
                        {LEVELS.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </label>

                    <div
                      className={[
                        styles.dropzone,
                        dragOver ? styles.dropzoneActive : '',
                      ].join(' ')}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setDragOver(true)
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault()
                        setDragOver(false)
                        const file = e.dataTransfer.files?.[0]
                        if (file) setImageFromFile(file)
                      }}
                    >
                      <div className={styles.dropzoneText}>
                        <strong>Drag & drop an image here or paste / upload</strong>
                        <span className={styles.dropzoneHint}>
                          Supported formats: PNG, JPG · Max file size: 5MB
                        </span>
                      </div>
                      <button
                        type="button"
                        className={styles.uploadBtn}
                        onClick={() => imageInputRef.current?.click()}
                      >
                        <FiUpload size={14} /> Upload
                      </button>
                      <input
                        ref={imageInputRef}
                        id="ai-gen-image-file"
                        name="image"
                        type="file"
                        accept="image/png,image/jpeg"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) setImageFromFile(f)
                        }}
                      />
                    </div>

                    {imageFile && (
                      <p className={styles.fileMeta}>
                        Selected: <strong>{imageFile.name}</strong> ({(imageFile.size / 1024).toFixed(0)} KB)
                      </p>
                    )}
                    {imageErr && <p className={styles.err}>{imageErr}</p>}
                    {activeError && (
                      <p className={styles.err}>
                        {'data' in activeError && typeof (activeError as { data?: { error?: string } }).data?.error === 'string'
                          ? (activeError as { data: { error: string } }).data.error
                          : 'Could not extract from image. Check the server.'}
                      </p>
                    )}
                    <button type="submit" className={styles.submit} disabled={busy || !imageFile}>
                      {imageLoading ? <><LoaderDots size="sm" /> Extracting</> : 'Extract vocabulary'}
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
                    onApply(preview, mode, frontLang, backLang, contentKind)
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
