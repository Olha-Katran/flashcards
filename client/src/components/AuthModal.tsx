import { useAuth } from '../auth/AuthContext'
import { hasGoogleOAuthClientId } from '../config/publicEnv'
import { GoogleSignInButton } from './GoogleSignInButton'
import { LoaderDots } from './LoaderDots'
import styles from './AuthModal.module.scss'

interface Props {
  open: boolean
  onClose: () => void
}

export function AuthModal({ open, onClose }: Props) {
  const { login, loading } = useAuth()

  if (!open) return null

  async function handleSuccess(credential: string) {
    try {
      await login(credential)
      onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.close} onClick={onClose}>
          ×
        </button>
        <h2 className={styles.title}>Sign in</h2>
        <p className={styles.sub}>
          Sign in with your Google account to save flashcard groups and track your progress.
        </p>

        <div className={styles.provider}>
          {loading ? (
            <p className={styles.loading}><LoaderDots /> Signing in</p>
          ) : hasGoogleOAuthClientId ? (
            <GoogleSignInButton
              onSuccess={(credential) => handleSuccess(credential)}
              onError={() => alert('Google Sign-In failed. If you see origin errors, add this URL to Google Cloud → OAuth client → Authorized JavaScript origins: ' + window.location.origin)}
            />
          ) : (
            <p className={styles.configWarning}>
              Google Sign-In is not configured for this build. Add{' '}
              <code>VITE_GOOGLE_CLIENT_ID</code> in Vercel → Environment Variables (Production),
              then redeploy so the client bundle includes your Web OAuth client ID.
            </p>
          )}
        </div>

        <p className={styles.note}>
          You can generate cards without signing in, but you need an account to save groups.
        </p>
      </div>
    </div>
  )
}
