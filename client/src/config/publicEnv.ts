/**
 * Vite inlines `import.meta.env.VITE_*` at build time.
 * Set `VITE_GOOGLE_CLIENT_ID` in Vercel → Environment Variables (Production) and redeploy.
 */
export const GOOGLE_OAUTH_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim()

export const hasGoogleOAuthClientId = GOOGLE_OAUTH_CLIENT_ID.length > 0
