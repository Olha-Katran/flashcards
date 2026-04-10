import { useEffect, useRef } from 'react'
import { GOOGLE_OAUTH_CLIENT_ID } from '../config/publicEnv'
import {
  ensureGoogleIdentityInitialized,
  loadGoogleIdentityScript,
  renderGoogleSignInButton,
} from '../lib/googleIdentity'
import styles from './GoogleSignInButton.module.scss'

type Props = {
  onSuccess: (credential: string) => void
  onError?: () => void
}

/**
 * GIS button without @react-oauth/google's GoogleLogin (which re-runs initialize on every effect,
 * doubling under React StrictMode). Script load + initialize are guarded globally.
 */
export function GoogleSignInButton({ onSuccess, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const handlersRef = useRef({ onSuccess, onError })
  handlersRef.current = { onSuccess, onError }

  useEffect(() => {
    const clientId = GOOGLE_OAUTH_CLIENT_ID
    if (!clientId) return

    let cancelled = false

    async function setup() {
      try {
        if (import.meta.env.DEV) {
          // Helps debug 403 "origin not allowed" — must match Google Cloud Console JS origins.
          // eslint-disable-next-line no-console
          console.info('[GoogleSignIn] window origin:', window.location.origin)
        }

        await loadGoogleIdentityScript()
        if (cancelled || !containerRef.current) return

        ensureGoogleIdentityInitialized(clientId, () => ({
          onCredential: (c) => handlersRef.current.onSuccess(c),
          onError: () => handlersRef.current.onError?.(),
        }))

        renderGoogleSignInButton(containerRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          width: 320,
          text: 'signin_with',
        })
      } catch {
        handlersRef.current.onError?.()
      }
    }

    void setup()

    return () => {
      cancelled = true
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [])

  return <div className={styles.wrap} ref={containerRef} />
}
