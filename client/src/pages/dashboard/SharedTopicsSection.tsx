import { Link } from 'react-router-dom'
import { HorizontalInfiniteRow } from '../../components/HorizontalInfiniteRow/HorizontalInfiniteRow'
import { LoaderDots } from '../../components/LoaderDots'
import type { AuthUser } from '../../auth/AuthContext'
import type { SharedGroupSummary } from '../../types'
import styles from '../DashboardPage.module.scss'

type Props = {
  level: string
  topics: SharedGroupSummary[]
  user: AuthUser | null
  startingTopic: string | null
  onStartTopic: (topic: string) => void
  /** When search filtered out all topics but some existed before filtering */
  showEmptySearch?: boolean
}

export function SharedTopicsSection({
  level,
  topics,
  user,
  startingTopic,
  onStartTopic,
  showEmptySearch,
}: Props) {
  if (topics.length === 0) {
    if (!showEmptySearch) return null
    return (
      <section className={styles.sharedSection}>
        <div className={styles.sharedHead}>
          <h2 className={styles.sharedTitle}>
            <Link to="/starter-pack" className={styles.sharedTitleLink}>
              Vocabulary topics
            </Link>
          </h2>
          <span className={styles.levelBadge}>{level}</span>
        </div>
        <p className={styles.searchEmpty} role="status">
          No vocabulary topics match your search.
        </p>
      </section>
    )
  }

  return (
    <section className={styles.sharedSection}>
      <div className={styles.sharedHead}>
        <h2 className={styles.sharedTitle}>
          <Link to="/starter-pack" className={styles.sharedTitleLink}>
            Vocabulary topics
          </Link>
        </h2>
        <span className={styles.levelBadge}>{level}</span>
      </div>
      <HorizontalInfiniteRow
        ariaLabel="Recommended vocabulary topics"
        items={topics}
        itemKey={(sg) => sg.topic}
        renderItem={(sg) => {
          const isStarting = startingTopic === sg.topic
          return (
            <article className={styles.sharedCard}>
              <div className={styles.sharedCardTop}>
                <h3 className={styles.sharedCardTitle}>{sg.title}</h3>
                <span className={styles.sharedLevelBadge}>Starter pack</span>
              </div>
              <p className={styles.sharedCardMeta}>
                {sg.flashcardCount} cards · English → Ukrainian · {sg.level}
              </p>
              <button
                type="button"
                className={styles.sharedStart}
                onClick={() => onStartTopic(sg.topic)}
                disabled={!!startingTopic}
              >
                {isStarting ? <LoaderDots /> : user ? 'Start studying' : 'Sign in to start'}
              </button>
            </article>
          )
        }}
      />
    </section>
  )
}
