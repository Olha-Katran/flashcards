import dotenv from 'dotenv'
dotenv.config()

import app from './app.js'

const PORT = Number(process.env.PORT) || 3001

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://localhost:${PORT}`)
  console.log(`Swagger docs at http://localhost:${PORT}/api-docs`)
})
