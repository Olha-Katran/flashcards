import { useState } from 'react'
import { GroupCard } from '../components/GroupCard'
import { AiGeneratorModal } from '../components/AiGeneratorModal'
import {
  useDeleteGroupMutation,
  useListGroupsQuery,
} from '../services/api'
import type { FlashcardDraft, GroupMode } from '../types'
import { useNavigate } from 'react-router-dom'
import styles from './DashboardPage.module.scss'

export function DashboardPage() {
  const { data: groups, isLoading, isError } = useListGroupsQuery()
  const [deleteGroup] = useDeleteGroupMutation()
  const [aiOpen, setAiOpen] = useState(false)
  const navigate = useNavigate()

  async function handleDelete(id: string) {
    if (!confirm('Delete this group?')) return
    try {
      await deleteGroup(id).unwrap()
    } catch {
      alert('Could not delete')
    }
  }

  function handleAiApply(cards: FlashcardDraft[], mode: GroupMode, frontLang: string, backLang: string) {
    navigate('/groups/new', { state: { aiCards: cards, aiMode: mode, aiFrontLang: frontLang, aiBackLang: backLang } })
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div>
          <h1 className={styles.title}>Your groups</h1>
          <p className={styles.sub}>
            Create decks, learn with flip and quizzes, pass the exam to mark a
            group as learnt.
          </p>
        </div>
        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.ai}
            onClick={() => setAiOpen(true)}
          >
            Generate with AI
          </button>
        </div>
      </div>

      {isLoading && <p className={styles.muted}>Loading…</p>}
      {isError && (
        <p className={styles.err}>
          Cannot reach API. Start the server and check VITE_API_URL.
        </p>
      )}
      {groups && groups.length === 0 && (
        <p className={styles.empty}>
          No groups yet. Create one or generate cards with AI.
        </p>
      )}
      {groups && groups.length > 0 && (
        <div className={styles.grid}>
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <AiGeneratorModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onApply={handleAiApply}
      />
    </div>
  )
}
