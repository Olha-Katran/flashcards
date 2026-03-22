import { Router } from 'express'
import multer from 'multer'
import { generateFlashcards, generateFromPdf, validateAnswer } from '../gemini.js'
import type { AiGenerateBody, GroupMode } from '../types.js'

export const aiRouter = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype === 'application/pdf')
  },
})

aiRouter.post('/validate-answer', async (req, res) => {
  const { userAnswer, correctAnswer, englishWord, mode, frontLang, backLang } = req.body as {
    userAnswer?: string
    correctAnswer?: string
    englishWord?: string
    mode?: string
    frontLang?: string
    backLang?: string
  }

  if (typeof userAnswer !== 'string' || typeof correctAnswer !== 'string') {
    return res.status(400).json({ error: 'userAnswer and correctAnswer are required' })
  }

  const groupMode: GroupMode = mode === 'definition' ? 'definition' : 'translation'

  try {
    const result = await validateAnswer(
      userAnswer,
      correctAnswer,
      typeof englishWord === 'string' ? englishWord : '',
      groupMode,
      typeof frontLang === 'string' ? frontLang : 'English',
      typeof backLang === 'string' ? backLang : 'Ukrainian'
    )
    res.json(result)
  } catch (err: unknown) {
    const status = (err as { status?: number }).status
    const msg = err instanceof Error ? err.message : String(err)

    if (status === 429 || msg.toLowerCase().includes('quota')) {
      return res.status(429).json({ error: 'Rate limit — falling back to strict match.' })
    }

    console.error('Validate answer error:', msg)
    return res.status(502).json({ error: 'Validation failed.' })
  }
})

aiRouter.post('/generate', async (req, res) => {
  const body = req.body as Partial<AiGenerateBody>
  const topic = typeof body.topic === 'string' ? body.topic.trim() : ''
  const englishLevel = typeof body.englishLevel === 'string' ? body.englishLevel.trim() : 'B1'
  const count = typeof body.count === 'number' ? body.count : 10
  const preferences = typeof body.preferences === 'string' ? body.preferences : undefined
  const groupMode: GroupMode = body.mode === 'definition' ? 'definition' : 'translation'
  const frontLang = typeof body.frontLang === 'string' && body.frontLang.trim() ? body.frontLang.trim() : 'English'
  const backLang = typeof body.backLang === 'string' && body.backLang.trim()
    ? body.backLang.trim()
    : groupMode === 'definition' ? 'English' : 'Ukrainian'

  if (!topic) {
    return res.status(400).json({ error: 'topic is required' })
  }
  if (count < 1 || count > 30) {
    return res.status(400).json({ error: 'count must be between 1 and 30' })
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' })
  }

  try {
    const flashcards = await generateFlashcards(topic, englishLevel, count, groupMode, frontLang, backLang, preferences)
    res.json({ flashcards })
  } catch (err: unknown) {
    const status = (err as { status?: number }).status
    const msg = err instanceof Error ? err.message : String(err)

    if (status === 429 || msg.toLowerCase().includes('quota')) {
      return res.status(429).json({ error: 'Rate limit reached. Please wait a moment and try again.' })
    }
    if (status === 401 || status === 403 || msg.includes('API key')) {
      return res.status(401).json({ error: 'Invalid or missing API key.' })
    }

    console.error('Gemini generate error:', msg)
    return res.status(502).json({ error: 'AI generation failed. Please try again.' })
  }
})

aiRouter.post('/generate-from-pdf', upload.single('pdf'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'A PDF file is required.' })
  }

  const englishLevel = typeof req.body.englishLevel === 'string'
    ? req.body.englishLevel.trim()
    : 'B1'

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' })
  }

  try {
    const flashcards = await generateFromPdf(req.file.buffer, englishLevel)
    res.json({ flashcards })
  } catch (err: unknown) {
    const status = (err as { status?: number }).status
    const msg = err instanceof Error ? err.message : String(err)

    if (status === 429 || msg.toLowerCase().includes('quota')) {
      return res.status(429).json({ error: 'Rate limit reached. Please wait a moment and try again.' })
    }
    if (status === 401 || status === 403 || msg.includes('API key')) {
      return res.status(401).json({ error: 'Invalid or missing API key.' })
    }

    console.error('Gemini PDF generate error:', msg)
    return res.status(502).json({ error: 'AI generation from PDF failed. Please try again.' })
  }
})
