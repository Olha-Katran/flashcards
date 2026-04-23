import { Router, type Response } from 'express'
import multer from 'multer'
import { generateFlashcards, generateFromImage, generateFromPdf, regenerateSingle, validateAnswer } from '../openai.js'
import type { AiGenerateBody, ContentKind, GroupMode } from '../types.js'

function sendAiRouteError(res: Response, err: unknown, logPrefix: string, generic502?: string) {
  const status = (err as { status?: number }).status
  const msg = err instanceof Error ? err.message : String(err)

  if (status === 429 || msg.toLowerCase().includes('quota')) {
    return res.status(429).json({ error: 'Rate limit reached. Please wait a moment and try again.' })
  }
  if (status === 401 || status === 403 || msg.includes('API key')) {
    return res.status(401).json({ error: 'Invalid or missing API key.' })
  }
  if (status === 400 && msg.toLowerCase().includes('prompt blocked')) {
    return res.status(400).json({
      error: 'That prompt was blocked by AI safety filters. Try rephrasing the topic or preferences.',
    })
  }
  if (status === 422) {
    return res.status(422).json({
      error: 'The AI declined to generate this content. Try different wording or a simpler topic.',
    })
  }
  if (status === 503 || status === 504 || /\bOpenAI API 503\b|\bOpenAI API 504\b/.test(msg)) {
    return res.status(503).json({
      error: 'The AI service is temporarily unavailable. Please try again in a minute.',
    })
  }
  if (err instanceof SyntaxError) {
    console.error(logPrefix, msg)
    return res.status(502).json({
      error: 'The AI returned a malformed response. Try again, or use a smaller word count.',
    })
  }
  if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
    return res.status(504).json({
      error: 'The AI request timed out. Try fewer words, shorter preferences, or again in a moment.',
    })
  }

  console.error(logPrefix, msg)
  return res.status(502).json({ error: generic502 ?? 'AI generation failed. Please try again.' })
}

function parseContentKind(v: unknown): ContentKind {
  return v === 'phrasal_verbs' ? 'phrasal_verbs' : 'vocabulary'
}

export const aiRouter = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype === 'application/pdf')
  },
})

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype === 'image/png' || file.mimetype === 'image/jpeg')
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
  const body = req.body as Partial<AiGenerateBody> & { exclude?: string[] }
  const topic = typeof body.topic === 'string' ? body.topic.trim() : ''
  const englishLevel = typeof body.englishLevel === 'string' ? body.englishLevel.trim() : 'B1'
  const count = typeof body.count === 'number' ? body.count : 10
  const preferences = typeof body.preferences === 'string' ? body.preferences : undefined
  const groupMode: GroupMode = body.mode === 'definition' ? 'definition' : 'translation'
  const contentKind = parseContentKind(body.contentKind)
  const frontLang = typeof body.frontLang === 'string' && body.frontLang.trim() ? body.frontLang.trim() : 'English'
  const backLang = typeof body.backLang === 'string' && body.backLang.trim()
    ? body.backLang.trim()
    : groupMode === 'definition' ? 'English' : 'Ukrainian'
  const exclude = Array.isArray(body.exclude) ? body.exclude : []

  if (!topic) {
    return res.status(400).json({ error: 'topic is required' })
  }
  if (count < 1 || count > 30) {
    return res.status(400).json({ error: 'count must be between 1 and 30' })
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the server' })
  }

  try {
    const flashcards = await generateFlashcards(
      topic,
      englishLevel,
      count,
      groupMode,
      frontLang,
      backLang,
      preferences,
      exclude,
      contentKind
    )
    res.json({ flashcards })
  } catch (err: unknown) {
    return sendAiRouteError(res, err, 'OpenAI generate error:')
  }
})

aiRouter.post('/regenerate-one', async (req, res) => {
  const { topic, englishLevel, mode, frontLang, backLang, exclude, contentKind } = req.body as {
    topic?: string
    englishLevel?: string
    mode?: string
    frontLang?: string
    backLang?: string
    exclude?: string[]
    contentKind?: unknown
  }

  if (!topic || typeof topic !== 'string') {
    return res.status(400).json({ error: 'topic is required' })
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the server' })
  }

  const groupMode: GroupMode = mode === 'definition' ? 'definition' : 'translation'
  const ck = parseContentKind(contentKind)

  try {
    const card = await regenerateSingle(
      topic.trim(),
      typeof englishLevel === 'string' ? englishLevel.trim() : 'B1',
      groupMode,
      typeof frontLang === 'string' ? frontLang.trim() : 'English',
      typeof backLang === 'string' ? backLang.trim() : 'Ukrainian',
      Array.isArray(exclude) ? exclude : [],
      ck
    )
    res.json({ card })
  } catch (err: unknown) {
    return sendAiRouteError(res, err, 'OpenAI regenerate-one error:')
  }
})

aiRouter.post('/generate-from-pdf', upload.single('pdf'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'A PDF file is required.' })
  }

  const englishLevel = typeof req.body.englishLevel === 'string'
    ? req.body.englishLevel.trim()
    : 'B1'

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the server' })
  }

  try {
    const flashcards = await generateFromPdf(req.file.buffer, englishLevel)
    res.json({ flashcards })
  } catch (err: unknown) {
    return sendAiRouteError(res, err, 'OpenAI PDF generate error:', 'AI generation from PDF failed. Please try again.')
  }
})

aiRouter.post('/generate-from-image', uploadImage.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'An image file is required.' })
  }

  const englishLevel = typeof req.body.englishLevel === 'string'
    ? req.body.englishLevel.trim()
    : 'B1'

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the server' })
  }

  try {
    const flashcards = await generateFromImage(req.file.buffer, req.file.mimetype, englishLevel)
    res.json({ flashcards })
  } catch (err: unknown) {
    return sendAiRouteError(res, err, 'OpenAI image generate error:', 'AI generation from image failed. Please try again.')
  }
})
