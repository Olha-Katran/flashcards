import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AiGeneratorModal } from '../components/AiGeneratorModal'
import {
  useCreateGroupMutation,
  useGetGroupQuery,
  useUpdateGroupMutation,
} from '../services/api'
import type { Flashcard, FlashcardDraft, GroupMode } from '../types'
import styles from './GroupEditPage.module.scss'

type Row = FlashcardDraft & { id?: string; status?: Flashcard['status'] }

const POPULAR_LANGUAGES = [
  'English', 'Ukrainian', 'Spanish', 'French', 'German',
  'Italian', 'Portuguese', 'Polish', 'Japanese', 'Chinese',
  'Korean', 'Arabic', 'Turkish', 'Dutch', 'Swedish',
]

function emptyRow(mode: GroupMode): Row {
  return {
    english: '',
    back: '',
    backKind: mode === 'definition' ? 'meaning' : 'translation',
    status: 'new',
  }
}

export function GroupEditPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()
  const location = useLocation()

  const { data: existing, isLoading } = useGetGroupQuery(id!, { skip: !id })
  const [createGroup, { isLoading: creating }] = useCreateGroupMutation()
  const [updateGroup, { isLoading: updating }] = useUpdateGroupMutation()

  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<GroupMode>('translation')
  const [frontLang, setFrontLang] = useState('English')
  const [backLang, setBackLang] = useState('Ukrainian')
  const [rows, setRows] = useState<Row[]>([emptyRow('translation')])
  const [aiOpen, setAiOpen] = useState(false)

  useEffect(() => {
    if (!isNew && existing) {
      setTitle(existing.title)
      setMode(existing.mode ?? 'translation')
      setFrontLang(existing.frontLang ?? 'English')
      setBackLang(existing.backLang ?? 'Ukrainian')
      setRows(
        existing.flashcards.map((c) => ({
          id: c.id,
          english: c.english,
          back: c.back,
          backKind: c.backKind,
          status: c.status,
          pronunciation: c.pronunciation,
          partOfSpeech: c.partOfSpeech,
          exampleSentence: c.exampleSentence,
        }))
      )
    }
  }, [isNew, existing])

  useEffect(() => {
    const st = location.state as {
      aiCards?: FlashcardDraft[]
      aiMode?: GroupMode
      aiFrontLang?: string
      aiBackLang?: string
    } | null
    const ai = st?.aiCards
    if (ai && ai.length && isNew) {
      if (st?.aiMode) setMode(st.aiMode)
      if (st?.aiFrontLang) setFrontLang(st.aiFrontLang)
      if (st?.aiBackLang) setBackLang(st.aiBackLang)
      setRows(
        ai.map((c) => ({
          english: c.english,
          back: c.back,
          backKind: c.backKind,
          status: 'new' as const,
          pronunciation: c.pronunciation,
          partOfSpeech: c.partOfSpeech,
          exampleSentence: c.exampleSentence,
        }))
      )
      navigate('.', { replace: true, state: {} })
    }
  }, [location.state, isNew, navigate])

  function handleModeChange(newMode: GroupMode) {
    setMode(newMode)
    if (newMode === 'definition') {
      setBackLang(frontLang)
    } else if (backLang === frontLang) {
      setBackLang('Ukrainian')
    }
  }

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r, j) => (j === i ? { ...r, ...patch } : r))
    )
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow(mode)])
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, j) => j !== i))
  }

  const backKind = mode === 'definition' ? 'meaning' as const : 'translation' as const

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const flashcards = rows
      .filter((r) => r.english.trim() && r.back.trim())
      .map((r) => ({
        id: r.id,
        english: r.english.trim(),
        back: r.back.trim(),
        backKind,
        status: r.status,
        pronunciation: r.pronunciation,
        partOfSpeech: r.partOfSpeech,
        exampleSentence: r.exampleSentence,
      }))

    try {
      if (isNew) {
        const g = await createGroup({
          title: title.trim() || 'Untitled',
          flashcards,
          mode,
          frontLang,
          backLang,
        }).unwrap()
        navigate(`/groups/${g.id}`)
      } else if (id) {
        await updateGroup({
          id,
          title: title.trim() || 'Untitled',
          flashcards,
          mode,
          frontLang,
          backLang,
        }).unwrap()
        navigate(`/groups/${id}`)
      }
    } catch {
      alert('Save failed')
    }
  }

  function mergeAi(cards: FlashcardDraft[], aiMode: GroupMode, aiFrontLang: string, aiBackLang: string) {
    setMode(aiMode)
    setFrontLang(aiFrontLang)
    setBackLang(aiBackLang)
    setRows((prev) => [
      ...prev.filter((r) => r.english.trim() || r.back.trim()),
      ...cards.map((c) => ({
        english: c.english,
        back: c.back,
        backKind: c.backKind,
        status: 'new' as const,
        pronunciation: c.pronunciation,
        partOfSpeech: c.partOfSpeech,
        exampleSentence: c.exampleSentence,
      })),
    ])
  }

  if (!isNew && isLoading) {
    return <p className={styles.muted}>Loading…</p>
  }

  const busy = creating || updating
  const backPlaceholder = mode === 'definition'
    ? 'Definition'
    : `${backLang} translation`

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <Link to="/" className={styles.back}>
          ← Dashboard
        </Link>
        <h1 className={styles.title}>{isNew ? 'New group' : 'Edit group'}</h1>
        <button
          type="button"
          className={styles.ai}
          onClick={() => setAiOpen(true)}
        >
          Generate with AI
        </button>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span>Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My vocabulary"
            required
          />
        </label>

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
              {POPULAR_LANGUAGES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </label>
          {mode === 'translation' && (
            <label className={styles.field}>
              <span>Back language</span>
              <select value={backLang} onChange={(e) => setBackLang(e.target.value)}>
                {POPULAR_LANGUAGES.filter((l) => l !== frontLang).map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className={styles.cardsHead}>
          <span>Flashcards</span>
          <button type="button" className={styles.add} onClick={addRow}>
            + Add row
          </button>
        </div>

        <div className={styles.rows}>
          {rows.map((row, i) => (
            <div key={row.id ?? `new-${i}`} className={styles.row}>
              <input
                className={styles.en}
                placeholder={`${frontLang} word`}
                value={row.english}
                onChange={(e) => updateRow(i, { english: e.target.value })}
              />
              <input
                className={styles.backInput}
                placeholder={backPlaceholder}
                value={row.back}
                onChange={(e) => updateRow(i, { back: e.target.value })}
              />
              <button
                type="button"
                className={styles.remove}
                onClick={() => removeRow(i)}
                aria-label="Remove row"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.save} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
          <Link to={isNew ? '/' : `/groups/${id}`} className={styles.cancel}>
            Cancel
          </Link>
        </div>
      </form>

      <AiGeneratorModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onApply={mergeAi}
        mode={mode}
        frontLang={frontLang}
        backLang={backLang}
      />
    </div>
  )
}
