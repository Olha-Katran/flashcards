import cors from 'cors'
import express from 'express'
import swaggerUi from 'swagger-ui-express'
import { aiRouter } from './routes/ai.js'
import { groupsRouter } from './routes/groups.js'
import { swaggerDocument } from './swagger.js'

const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

const app = express()

app.use(
  cors({
    origin: clientOrigin,
  })
)
app.use(express.json({ limit: '25mb' }))

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

app.use('/api/groups', groupsRouter)
app.use('/api/ai', aiRouter)

export default app
