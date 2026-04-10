/**
 * Google Identity Services (GIS) — single script load + single initialize() per client_id.
 * @see https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid
 *
 * For production: add exact origins in Google Cloud Console → OAuth Web client →
 * Authorized JavaScript origins (e.g. https://your-app.vercel.app). 403 "origin not allowed"
 * means the current window.location.origin is missing there.
 */

const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

export type CredentialResponse = { credential?: string; select_by?: string }

declare global {
  interface Window {
    /** Set after first successful `initialize` for this client_id */
    __flashcardsGsiClientId?: string
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void
          renderButton: (el: HTMLElement | null, config: Record<string, unknown>) => void
        }
      }
    }
  }
}

let gsiScriptPromise: Promise<void> | null = null

export function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()

  if (gsiScriptPromise) return gsiScriptPromise

  gsiScriptPromise = new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve()
      return
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src^="${GSI_SCRIPT_SRC}"]`
    )
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Google Sign-In script failed')), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    script.src = GSI_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google Sign-In script failed'))
    document.head.appendChild(script)
  }).then(() => waitForGoogleIdentityReady())

  return gsiScriptPromise
}

function waitForGoogleIdentityReady(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const deadline = Date.now() + 10_000
    const id = window.setInterval(() => {
      if (window.google?.accounts?.id) {
        window.clearInterval(id)
        resolve()
      } else if (Date.now() > deadline) {
        window.clearInterval(id)
        reject(new Error('Google Identity Services did not become ready'))
      }
    }, 20)
  })
}

export type GoogleIdentityHandlers = {
  onCredential: (credential: string) => void
  onError?: () => void
}

/**
 * Calls `google.accounts.id.initialize` at most once per page per client_id.
 * Pass `getHandlers` so the GIS callback always invokes your latest React handlers (no stale closures).
 */
export function ensureGoogleIdentityInitialized(
  clientId: string,
  getHandlers: () => GoogleIdentityHandlers
): void {
  const id = window.google?.accounts?.id
  if (!id) {
    getHandlers().onError?.()
    return
  }

  if (window.__flashcardsGsiClientId !== clientId) {
    id.initialize({
      client_id: clientId,
      callback: (res: CredentialResponse) => {
        const { onCredential, onError } = getHandlers()
        if (res?.credential) onCredential(res.credential)
        else onError?.()
      },
    })
    window.__flashcardsGsiClientId = clientId
  }
}

export function renderGoogleSignInButton(
  container: HTMLElement,
  options: {
    theme?: 'outline' | 'filled_blue' | 'filled_black'
    size?: 'large' | 'medium' | 'small'
    shape?: 'rectangular' | 'pill' | 'circle' | 'square'
    width?: number | string
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  }
): void {
  const id = window.google?.accounts?.id
  if (!id) return
  container.innerHTML = ''
  id.renderButton(container, {
    type: 'standard',
    theme: options.theme ?? 'filled_black',
    size: options.size ?? 'large',
    shape: options.shape ?? 'pill',
    width: options.width ?? 320,
    text: options.text ?? 'signin_with',
  })
}
