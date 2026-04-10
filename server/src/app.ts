import cors from 'cors'
import express from 'express'
import { optionalAuth } from './auth.js'
import { buildCorsOptions } from './cors.js'
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

app.get('/api-docs', (_req, res) => {
  res.json(swaggerDocument)
})

app.use('/api/auth', authRouter)
app.use('/api/groups', groupsRouter)
app.use('/api/ai', aiRouter)
app.use('/api/shared-groups', sharedRouter)

export default app
