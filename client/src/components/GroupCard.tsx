import { Link } from 'react-router-dom'
import type { GroupSummary } from '../types'
import styles from './GroupCard.module.scss'

const statusLabel: Record<GroupSummary['groupStatus'], string> = {
  in_progress: 'In progress',
  learnt: 'Learnt',
}

export function GroupCard({
  group,
  onDelete,
}: {
  group: GroupSummary
  onDelete: (id: string) => void
}) {
  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <h2 className={styles.title}>{group.title}</h2>
        <span
          className={
            group.groupStatus === 'learnt' ? styles.badgeLearnt : styles.badge
          }
        >
          {statusLabel[group.groupStatus]}
        </span>
      </div>
      <p className={styles.meta}>
        {group.flashcardCount} cards ·{' '}
        {group.mode === 'definition'
          ? `${group.frontLang} definitions`
          : `${group.frontLang} → ${group.backLang}`}
      </p>
      <div className={styles.actions}>
        <Link to={`/groups/${group.id}`} className={styles.primary}>
          Open
        </Link>
        <Link to={`/groups/${group.id}/edit`} className={styles.link}>
          Edit
        </Link>
        <button
          type="button"
          className={styles.danger}
          onClick={() => onDelete(group.id)}
        >
          Delete
        </button>
      </div>
    </article>
  )
}
