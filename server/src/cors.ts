import type { CorsOptions } from 'cors'
import type { Request, Response } from 'express'

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
 * Same rules as CORS middleware — use for error responses so browsers don't show a fake "CORS" error
 * when the real problem was an uncaught exception or platform timeout without CORS headers.
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true

  const explicit = [
    ...parseOriginList(process.env.FRONTEND_URL),
    ...parseOriginList(process.env.CLIENT_ORIGIN),
  ]
  const allowVercelApp = process.env.CORS_ALLOW_VERCEL_PREVIEWS !== 'false'

  const isProd = process.env.NODE_ENV === 'production'
  const allowLocalhostDefault = !isProd || process.env.CORS_ALLOW_LOCALHOST === 'true'
  const allowLocalhost = process.env.CORS_ALLOW_LOCALHOST === 'false' ? false : allowLocalhostDefault

  if (explicit.includes(origin)) return true
  if (allowLocalhost && isLocalhostOrigin(origin)) return true
  if (allowVercelApp && isVercelAppOrigin(origin)) return true
  return false
}

/** Set ACAO on error responses when the request Origin is allowed (pairs with credentials: true). */
export function applyCorsToErrorResponse(req: Request, res: Response): void {
  const origin = req.headers.origin
  if (typeof origin !== 'string' || !isOriginAllowed(origin)) return
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Vary', 'Origin')
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
  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true)
        return
      }
      if (isOriginAllowed(origin)) {
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
