import { useAuth } from '../auth/AuthContext'
import type { EnglishLevel } from '../constants'
import { useEnglishLevel, LEVELS } from '../hooks/useEnglishLevel'
import { useUpdateSharedLevelMutation } from '../services/api'
import styles from './ProfilePage.module.scss'

export function ProfilePage() {
  const { user } = useAuth()
  const { level, setLevel } = useEnglishLevel()
  const [updateSharedLevel] = useUpdateSharedLevelMutation()

  function handleLevelChange(newLevel: EnglishLevel) {
    if (newLevel === level) return
    setLevel(newLevel)
    if (user) {
      updateSharedLevel(newLevel)
    }
  }

  if (!user) {
    return <p className={styles.muted}>Sign in to view your profile.</p>
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {user.picture && (
          <img src={user.picture} alt="" className={styles.avatar} referrerPolicy="no-referrer" />
        )}
        <div className={styles.info}>
          {user.name && <h2 className={styles.name}>{user.name}</h2>}
          <span className={styles.email}>{user.email}</span>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>English level</h3>
        <p className={styles.sectionHint}>
          This level is used as the default when generating flashcards or processing lessons.
          Changing it will replace unstarted shared vocabulary groups with ones matching your new level.
        </p>
        <div className={styles.levelPicker}>
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              className={`${styles.levelBtn} ${l === level ? styles.levelActive : ''}`}
              onClick={() => handleLevelChange(l)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
