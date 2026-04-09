import { LoaderDots } from '../../components/LoaderDots'
import type { AuthUser } from '../../auth/AuthContext'
import type { GroupSummary } from '../../types'
import styles from '../DashboardPage.module.scss'

type Props = {
  user: AuthUser | null
  groups: GroupSummary[] | undefined
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  hasRecommendedTopics: boolean
}

export function DashboardStatusBanners({
  user,
  groups,
  isLoading,
  isFetching,
  isError,
  hasRecommendedTopics,
}: Props) {
  return (
    <>
      {user && (isLoading || isFetching) && !groups && (
        <p className={styles.muted}>
          <LoaderDots />
        </p>
      )}
      {user && isError && (
        <p className={styles.err}>Cannot reach API. Start the server and check VITE_API_URL.</p>
      )}
      {user && groups && groups.length === 0 && !hasRecommendedTopics && (
        <p className={styles.empty}>No groups yet. Create one to get started.</p>
      )}
      {!user && !hasRecommendedTopics && (
        <p className={styles.empty}>Sign in to see your saved groups.</p>
      )}
    </>
  )
}
