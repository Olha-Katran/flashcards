import { Router } from 'express'
import { OAuth2Client } from 'google-auth-library'
import { prisma } from '../prisma.js'
import { signToken } from '../auth.js'

export const authRouter = Router()

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID)

authRouter.post('/google', async (req, res) => {
  const { credential } = req.body as { credential?: string }

  if (!credential) {
    return res.status(400).json({ error: 'Google credential is required' })
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload()

    if (!payload || !payload.sub || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google token' })
    }

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
    console.error('Google auth error:', err)
    res.status(401).json({ error: 'Google authentication failed' })
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
