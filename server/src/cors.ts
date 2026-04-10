import type { CorsOptions } from 'cors'

/**
 * Parse comma-separated origins (FRONTEND_URL="https://a.app,https://b.app").
 */
function parseOriginList(value: string | undefined): string[] {
  if (!value?.trim()) return []
  return [...new Set(value.split(',').map((s) => s.trim()).filter(Boolean))]
}

function isLocalhostOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin)
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return false
  }
}

/** Any https deployment on vercel.app (production + preview URLs). */
function isVercelAppOrigin(origin: string): boolean {
  try {
    const u = new URL(origin)
    return u.protocol === 'https:' && u.hostname.endsWith('.vercel.app')
  } catch {
    return false
  }
}

/**
 * CORS for browser clients (Vite app on Vercel + local dev).
 *
 * Env (backend / Vercel server project):
 * - FRONTEND_URL — required for explicit allowlist (comma-separated). Use your stable production URL(s).
 * - CLIENT_ORIGIN — legacy single origin; merged into allowlist if set.
 * - CORS_ALLOW_VERCEL_PREVIEWS — default "true": allow any https://*.vercel.app (preview + prod URLs).
 *   Set to "false" to allow only FRONTEND_URL / CLIENT_ORIGIN (stricter).
 * - CORS_ALLOW_LOCALHOST — default "true" when NODE_ENV !== "production"; in production default "false".
 *   Set to "true" to allow http://localhost:* / 127.0.0.1 against deployed API (local dev hitting prod API).
 */
export function buildCorsOptions(): CorsOptions {
  const explicit = [
    ...parseOriginList(process.env.FRONTEND_URL),
    ...parseOriginList(process.env.CLIENT_ORIGIN),
  ]
  const allowVercelApp = process.env.CORS_ALLOW_VERCEL_PREVIEWS !== 'false'

  const isProd = process.env.NODE_ENV === 'production'
  const allowLocalhostDefault = !isProd || process.env.CORS_ALLOW_LOCALHOST === 'true'
  const allowLocalhost = process.env.CORS_ALLOW_LOCALHOST === 'false' ? false : allowLocalhostDefault

  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true)
        return
      }

      if (explicit.includes(origin)) {
        callback(null, true)
        return
      }

      if (allowLocalhost && isLocalhostOrigin(origin)) {
        callback(null, true)
        return
      }

      if (allowVercelApp && isVercelAppOrigin(origin)) {
        callback(null, true)
        return
      }

      console.warn(`[cors] blocked origin: ${origin}`)
      callback(null, false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86_400,
  }
}
