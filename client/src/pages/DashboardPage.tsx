import { AuthModal } from '../components/AuthModal'
import { useDashboardPage } from '../hooks/useDashboardPage'
import { DashboardHero } from './dashboard/DashboardHero'
import { DashboardStatusBanners } from './dashboard/DashboardStatusBanners'
import { SharedTopicsSection } from './dashboard/SharedTopicsSection'
import { UserGroupsCarousel } from './dashboard/UserGroupsCarousel'
import styles from './DashboardPage.module.scss'

export function DashboardPage() {
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

  const hasRecommendedTopics = visibleShared.length > 0

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
        <UserGroupsCarousel groups={groups} onDeleteGroup={deleteGroupById} />
      )}

      <SharedTopicsSection
        level={level}
        topics={visibleShared}
        user={user}
        startingTopic={startingTopic}
        onStartTopic={startSharedTopic}
      />

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
