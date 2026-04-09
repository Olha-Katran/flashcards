import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { LoaderDots } from '../components/LoaderDots'
import { useEnglishLevel } from '../hooks/useEnglishLevel'
import { useListGroupsQuery, useListSharedGroupsQuery, useStartSharedGroupMutation } from '../services/api'
import styles from './StarterPackPage.module.scss'

const PAGE_SIZE = 12

export function StarterPackPage() {
  const { user } = useAuth()
  const { level } = useEnglishLevel()
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)

  const { currentData: groups } = useListGroupsQuery(user?.id, { skip: !user })
  const { data: shared, isLoading } = useListSharedGroupsQuery(level)
  const [startShared] = useStartSharedGroupMutation()

  const startedByTopic = new Map(
    (groups ?? [])
      .filter((g) => g.sharedTopic)
      .map((g) => [g.sharedTopic as string, g.id])
  )

  const items = shared ?? []
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const slice = items.slice(start, start + PAGE_SIZE)

  function goToPage(p: number) {
    const next = new URLSearchParams(params)
    next.set('page', String(p))
    setParams(next)
  }

  async function handleStart(topic: string) {
    if (!user) return
    const existingId = startedByTopic.get(topic)
    if (existingId) return
    const group = await startShared({ topic, level }).unwrap()
    window.location.assign(`/groups/${group.id}`)
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Starter pack</h1>
          <p className={styles.sub}>
            Ready-to-study vocabulary topics adapted to your level.
          </p>
        </div>
        <div className={styles.meta}>
          <span className={styles.level}>{level}</span>
        </div>
      </div>

      {isLoading && (
        <p className={styles.loading}><LoaderDots /></p>
      )}

      {!isLoading && (
        <>
          <div className={styles.grid}>
            {slice.map((sg) => {
              const existingId = startedByTopic.get(sg.topic)
              return (
                <article key={sg.topic} className={styles.card}>
                  <div className={styles.cardTop}>
                    <h3 className={styles.cardTitle}>{sg.title}</h3>
                    <span className={styles.badge}>Starter pack</span>
                  </div>
                  <p className={styles.cardMeta}>
                    {sg.flashcardCount} cards · English → Ukrainian · {sg.level}
                  </p>
                  <div className={styles.actions}>
                    {existingId ? (
                      <Link className={styles.primary} to={`/groups/${existingId}`}>
                        Open
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className={styles.primaryBtn}
                        disabled={!user}
                        onClick={() => handleStart(sg.topic)}
                      >
                        {user ? 'Start studying' : 'Sign in to start'}
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => goToPage(safePage - 1)}
                disabled={safePage <= 1}
              >
                Prev
              </button>
              <span className={styles.pageInfo}>
                Page {safePage} / {totalPages}
              </span>
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => goToPage(safePage + 1)}
                disabled={safePage >= totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

