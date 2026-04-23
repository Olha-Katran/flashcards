import cors from 'cors'
import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import swaggerUi from 'swagger-ui-express'
import { optionalAuth } from './auth.js'
import { applyCorsToErrorResponse, buildCorsOptions } from './cors.js'
import { aiRouter } from './routes/ai.js'
import { authRouter } from './routes/auth.js'
import { groupsRouter } from './routes/groups.js'
import { sharedRouter } from './routes/shared.js'
import { swaggerDocument } from './swagger.js'

const app = express()

app.use(cors(buildCorsOptions()))
app.use(express.json({ limit: '25mb' }))
app.use(optionalAuth)

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/openapi.json', (_req, res) => {
  res.json(swaggerDocument)
})

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customSiteTitle: 'Flashcards API — Swagger',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  })
)

app.use('/api/auth', authRouter)
app.use('/api/groups', groupsRouter)
app.use('/api/ai', aiRouter)
app.use('/api/shared-groups', sharedRouter)

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  applyCorsToErrorResponse(req, res)
  if (res.headersSent) return
  console.error('[express]', err)
  res.status(500).json({ error: 'Internal server error' })
})

export default app
