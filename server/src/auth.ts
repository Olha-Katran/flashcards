import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'flashcards-dev-secret'

export interface JwtPayload {
  userId: string
  email: string
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' })
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload
}

declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

/**
 * Middleware that extracts userId from a Bearer token when present.
 * Does NOT reject unauthenticated requests — downstream handlers
 * decide whether auth is required.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = verifyToken(header.slice(7))
      req.userId = payload.userId
    } catch { /* token invalid — treat as unauthenticated */ }
  }
  next()
}

/** Middleware that requires a valid JWT. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.userId) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  next()
}
