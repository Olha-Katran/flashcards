import { Link } from 'react-router-dom'
import { FiPlus } from 'react-icons/fi'
import type { AuthUser } from '../../auth/AuthContext'
import styles from '../DashboardPage.module.scss'

export function DashboardHero({ user }: { user: AuthUser | null }) {
  return (
    <div className={styles.hero}>
      <div>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Your groups</h1>
          <Link
            to="/groups/new"
            className={styles.newGroupIcon}
            aria-label="New group"
            title="New group"
          >
            <FiPlus size={22} strokeWidth={2.25} />
          </Link>
        </div>
        <p className={styles.sub}>
          {user
            ? 'Create decks, learn with flip and quizzes, pass the exam to mark a group as learnt.'
            : 'Sign in to save groups and track your progress.'}
        </p>
      </div>
    </div>
  )
}
