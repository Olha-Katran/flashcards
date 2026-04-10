/**
 * Vite inlines `import.meta.env.VITE_*` at build time.
 * Set `VITE_GOOGLE_CLIENT_ID` in Vercel → Environment Variables (Production) and redeploy.
 *
 * 403 "The given origin is not allowed for the given client ID" → Google Cloud Console →
 * your Web OAuth client → Authorized JavaScript origins must include `window.location.origin`
 * (e.g. https://your-app.vercel.app exactly, no trailing slash).
 */
export const GOOGLE_OAUTH_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim()

export const hasGoogleOAuthClientId = GOOGLE_OAUTH_CLIENT_ID.length > 0
