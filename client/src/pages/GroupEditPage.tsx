import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { AiGeneratorModal } from '../components/AiGeneratorModal'
import { AuthModal } from '../components/AuthModal'
import { LoaderDots } from '../components/LoaderDots'
import {
  useCreateGroupMutation,
  useGetGroupQuery,
  useUpdateGroupMutation,
} from '../services/api'
import { LANGUAGES } from '../constants'
import type { ContentKind, Flashcard, FlashcardDraft, GroupMode } from '../types'
import styles from './GroupEditPage.module.scss'

type Row = FlashcardDraft & { id?: string; status?: Flashcard['status'] }

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
  const { user } = useAuth()

  const { data: existing, isLoading } = useGetGroupQuery(id!, { skip: !id })
  const [createGroup, { isLoading: creating }] = useCreateGroupMutation()
  const [updateGroup, { isLoading: updating }] = useUpdateGroupMutation()

  const [title, setTitle] = useState('')
  const [contentKind, setContentKind] = useState<ContentKind>('vocabulary')
  const [mode, setMode] = useState<GroupMode>('translation')
  const [frontLang, setFrontLang] = useState('English')
  const [backLang, setBackLang] = useState('Ukrainian')
  const [rows, setRows] = useState<Row[]>([emptyRow('translation')])
  const [aiOpen, setAiOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
    if (!isNew && existing) {
      setTitle(existing.title)
      setContentKind(existing.contentKind ?? 'vocabulary')
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
      aiContentKind?: ContentKind
      aiFrontLang?: string
      aiBackLang?: string
    } | null
    const ai = st?.aiCards
    if (ai && ai.length && isNew) {
      if (st?.aiMode) setMode(st.aiMode)
      if (st?.aiContentKind) setContentKind(st.aiContentKind)
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

  function handleContentKindChange(ck: ContentKind) {
    setContentKind(ck)
    if (ck === 'phrasal_verbs') {
      setFrontLang('English')
      if (mode === 'translation' && backLang === 'English') setBackLang('Ukrainian')
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
    if (!user) {
      setAuthOpen(true)
      return
    }

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
          contentKind,
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
          contentKind,
          frontLang,
          backLang,
        }).unwrap()
        navigate(`/groups/${id}`)
      }
    } catch {
      alert('Save failed')
    }
  }

  function mergeAi(
    cards: FlashcardDraft[],
    aiMode: GroupMode,
    aiFrontLang: string,
    aiBackLang: string,
    aiContentKind: ContentKind
  ) {
    setMode(aiMode)
    setContentKind(aiContentKind)
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
    return <p className={styles.muted}><LoaderDots /></p>
  }

  const busy = creating || updating
  const backPlaceholder = mode === 'definition'
    ? 'Definition'
    : `${backLang} translation`

  const frontPlaceholder =
    contentKind === 'phrasal_verbs' ? 'Phrasal verb (e.g. put off)' : `${frontLang} word`

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        
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
            id="group-edit-title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My vocabulary"
            required
          />
        </label>

        <label className={styles.field}>
          <span>Card type</span>
          <select
            id="group-edit-content-kind"
            name="contentKind"
            value={contentKind}
            onChange={(e) => handleContentKindChange(e.target.value as ContentKind)}
          >
            <option value="vocabulary">Vocabulary</option>
            <option value="phrasal_verbs">Phrasal verbs</option>
          </select>
        </label>

        <div className={styles.modeRow}>
          <label className={styles.field}>
            <span>Mode</span>
            <select
              id="group-edit-mode"
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
                  id="group-edit-front-lang"
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
                    id="group-edit-back-lang"
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
            mode === 'translation' && (
              <label className={styles.field}>
                <span>Back language</span>
                <select
                  id="group-edit-back-lang"
                  name="backLang"
                  value={backLang}
                  onChange={(e) => setBackLang(e.target.value)}
                >
                  {LANGUAGES.filter((l) => l !== 'English').map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </label>
            )
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
                id={`group-edit-card-${i}-front`}
                name={`cards[${i}].english`}
                className={styles.en}
                placeholder={frontPlaceholder}
                value={row.english}
                onChange={(e) => updateRow(i, { english: e.target.value })}
              />
              <input
                id={`group-edit-card-${i}-back`}
                name={`cards[${i}].back`}
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
            {busy ? <><LoaderDots size="sm" /> Saving</> : user ? 'Save' : 'Sign in to save'}
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
        contentKind={contentKind}
        frontLang={frontLang}
        backLang={backLang}
      />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
