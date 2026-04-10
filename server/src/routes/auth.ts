import { Router } from 'express'
import { OAuth2Client } from 'google-auth-library'
import { prisma } from '../prisma.js'
import { signToken } from '../auth.js'

export const authRouter = Router()

function getGoogleClientId(): string {
  return (process.env.GOOGLE_CLIENT_ID ?? '').trim()
}

function getGoogleClient() {
  const id = getGoogleClientId()
  return id ? new OAuth2Client(id) : null
}

/**
 * Google Sign-In (button / One Tap) sends a JWT `credential` from the browser.
 * Its `aud` claim must match this exact Web client ID — the same value as the
 * frontend’s VITE_GOOGLE_CLIENT_ID. There is no server redirect/callback URL
 * for this flow; in Google Cloud Console use Authorized JavaScript origins
 * (e.g. https://your-frontend.vercel.app), not localhost for production.
 */
authRouter.post('/google', async (req, res) => {
  const clientId = getGoogleClientId()
  const googleClient = getGoogleClient()

  if (!clientId || !googleClient) {
    console.error('auth/google: GOOGLE_CLIENT_ID is missing or empty on the server')
    return res.status(503).json({ error: 'Server Google auth is not configured' })
  }

  const { credential } = req.body as { credential?: string }

  if (!credential) {
    return res.status(400).json({ error: 'Google credential is required' })
  }

  type GoogleIdPayload = { sub: string; email: string; name?: string; picture?: string }
  let payload: GoogleIdPayload

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId,
    })
    const p = ticket.getPayload()
    if (!p?.sub || !p.email) {
      return res.status(400).json({ error: 'Invalid Google token' })
    }
    payload = { sub: p.sub, email: p.email, name: p.name ?? undefined, picture: p.picture ?? undefined }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('auth/google: verifyIdToken failed (check GOOGLE_CLIENT_ID matches VITE_GOOGLE_CLIENT_ID):', msg)
    return res.status(401).json({ error: 'Google authentication failed' })
  }

  try {
    const user = await prisma.user.upsert({
      where: { googleId: payload.sub },
      update: {
        email: payload.email,
        name: payload.name ?? null,
        picture: payload.picture ?? null,
      },
      create: {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name ?? null,
        picture: payload.picture ?? null,
      },
    })

    const token = signToken({ userId: user.id, email: user.email })

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    })
  } catch (err) {
    console.error('auth/google: database error during upsert:', err)
    return res.status(500).json({ error: 'Could not save user' })
  }
})

authRouter.get('/me', async (req, res) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  try {
    const { verifyToken } = await import('../auth.js')
    const payload = verifyToken(header.slice(7))
    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    })
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
})
