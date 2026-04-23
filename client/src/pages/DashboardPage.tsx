import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AuthModal } from '../components/AuthModal'
import { useDashboardPage } from '../hooks/useDashboardPage'
import type { GroupSummary } from '../types'
import {
  DASHBOARD_SEARCH_QUERY_PARAM,
  groupMatchesDashboardQuery,
  sharedTopicMatchesDashboardQuery,
} from '../utils/dashboardSearch'
import { DashboardHero } from './dashboard/DashboardHero'
import { DashboardStatusBanners } from './dashboard/DashboardStatusBanners'
import { SharedTopicsSection } from './dashboard/SharedTopicsSection'
import { UserGroupsCarousel } from './dashboard/UserGroupsCarousel'
import styles from './DashboardPage.module.scss'

export function DashboardPage() {
  const [searchParams] = useSearchParams()
  const listSearchQuery = searchParams.get(DASHBOARD_SEARCH_QUERY_PARAM) ?? ''

  const {
    user,
    level,
    groups,
    isLoading,
    isFetching,
    isError,
    visibleShared,
    authOpen,
    setAuthOpen,
    startingTopic,
    deleteGroupById,
    startSharedTopic,
  } = useDashboardPage()

  const filteredGroups = useMemo(
    () => (groups ?? []).filter((g) => groupMatchesDashboardQuery(g, listSearchQuery)),
    [groups, listSearchQuery]
  )

  const { inProgressGroups, learntGroups } = useMemo(() => {
    const byTitle = (a: GroupSummary, b: GroupSummary) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
    const inProgress = filteredGroups.filter((g) => g.groupStatus === 'in_progress').sort(byTitle)
    const learnt = filteredGroups.filter((g) => g.groupStatus === 'learnt').sort(byTitle)
    return { inProgressGroups: inProgress, learntGroups: learnt }
  }, [filteredGroups])

  const filteredShared = useMemo(
    () => visibleShared.filter((sg) => sharedTopicMatchesDashboardQuery(sg, listSearchQuery)),
    [visibleShared, listSearchQuery]
  )

  const hasRecommendedTopics = visibleShared.length > 0
  const searchActive = listSearchQuery.trim().length > 0

  return (
    <div className={styles.page}>
      <DashboardHero user={user} />

      <DashboardStatusBanners
        user={user}
        groups={groups}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        hasRecommendedTopics={hasRecommendedTopics}
      />

      {user && groups && groups.length > 0 && (
        filteredGroups.length > 0 ? (
          <div className={styles.userGroupsByStatus}>
            {inProgressGroups.length > 0 && (
              <section className={styles.userGroupsStatusBlock} aria-labelledby="dash-groups-in-progress">
                <h2 id="dash-groups-in-progress" className={styles.userGroupsStatusTitle}>
                  In progress
                </h2>
                <UserGroupsCarousel
                  groups={inProgressGroups}
                  onDeleteGroup={deleteGroupById}
                  carouselAriaLabel="Your groups in progress"
                />
              </section>
            )}
            {learntGroups.length > 0 && (
              <section className={styles.userGroupsStatusBlock} aria-labelledby="dash-groups-learnt">
                <h2 id="dash-groups-learnt" className={styles.userGroupsStatusTitle}>
                  Learnt
                </h2>
                <UserGroupsCarousel
                  groups={learntGroups}
                  onDeleteGroup={deleteGroupById}
                  carouselAriaLabel="Your learnt groups"
                />
              </section>
            )}
          </div>
        ) : (
          <p className={styles.searchEmpty} role="status">
            No decks match your search.
          </p>
        )
      )}

      <SharedTopicsSection
        level={level}
        topics={filteredShared}
        user={user}
        startingTopic={startingTopic}
        onStartTopic={startSharedTopic}
        showEmptySearch={searchActive && visibleShared.length > 0 && filteredShared.length === 0}
      />

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
