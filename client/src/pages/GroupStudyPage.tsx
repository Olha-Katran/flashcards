import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ReviewMode } from '../components/study/ReviewMode'
import { LearnMode } from '../components/study/LearnMode'
import { ExamMode } from '../components/study/ExamMode'
import { useGetGroupQuery } from '../services/api'
import styles from './GroupStudyPage.module.scss'

type Tab = 'review' | 'learn' | 'exam'

export function GroupStudyPage() {
  const { id } = useParams<{ id: string }>()
  const { data: group, isLoading, isError } = useGetGroupQuery(id!, {
    skip: !id,
  })
  const [tab, setTab] = useState<Tab>('review')

  if (!id) return null
  if (isLoading) return <p className={styles.muted}>Loading…</p>
  if (isError || !group) {
    return (
      <p className={styles.err}>
        Group not found. <Link to="/">Back</Link>
      </p>
    )
  }

  const mode = group.mode ?? 'translation'
  const frontLang = group.frontLang ?? 'English'
  const backLang = group.backLang ?? 'Ukrainian'

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <Link to="/" className={styles.back}>
          ← Dashboard
        </Link>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{group.title}</h1>
          <span className={styles.modeBadge}>
            {mode === 'definition' ? 'Definition' : `${frontLang} → ${backLang}`}
          </span>
          <span
            className={
              group.groupStatus === 'learnt' ? styles.badgeLearnt : styles.badge
            }
          >
            {group.groupStatus === 'learnt' ? 'Learnt' : 'In progress'}
          </span>
        </div>
        <Link to={`/groups/${group.id}/edit`} className={styles.edit}>
          Edit group
        </Link>
      </div>

      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'review'}
          className={tab === 'review' ? styles.tabOn : styles.tab}
          onClick={() => setTab('review')}
        >
          Review
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'learn'}
          className={tab === 'learn' ? styles.tabOn : styles.tab}
          onClick={() => setTab('learn')}
        >
          Learn
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'exam'}
          className={tab === 'exam' ? styles.tabOn : styles.tab}
          onClick={() => setTab('exam')}
        >
          Exam
        </button>
      </div>

      <section className={styles.body}>
        {tab === 'review' && (
          <ReviewMode groupId={group.id} cards={group.flashcards} frontLang={frontLang} />
        )}
        {tab === 'learn' && (
          <LearnMode
            cards={group.flashcards}
            mode={mode}
            frontLang={frontLang}
            backLang={backLang}
          />
        )}
        {tab === 'exam' && (
          <ExamMode
            groupId={group.id}
            cards={group.flashcards}
            mode={mode}
            frontLang={frontLang}
            backLang={backLang}
          />
        )}
      </section>
    </div>
  )
}
