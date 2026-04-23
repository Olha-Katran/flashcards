import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { generateFlashcards } from '../openai.js'
import { prisma } from '../prisma.js'

export const sharedRouter = Router()

const VALID_LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])

const SHARED_TOPICS = [
  'physical world', 'animals', 'weather', 'body', 'appearance',
  'character', 'feelings', 'family and friends', 'around the home',
  'money', 'health', 'clothes', 'food', 'shopping', 'cooking',
  'transport', 'jobs', 'career', 'business', 'finance',
  'sport', 'books', 'films', 'music',
]

const WORDS_PER_GROUP = 15

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Returns all topics for a level. Cached groups include flashcard count;
// uncached ones are returned as available but not yet generated.
sharedRouter.get('/', async (req, res) => {
  const level = String(req.query.level || 'B1').toUpperCase()
  if (!VALID_LEVELS.has(level)) {
    return res.status(400).json({ error: 'Invalid level' })
  }

  const cached = await prisma.sharedGroup.findMany({
    where: { level },
    include: { flashcards: true },
  })
  const byTopic = new Map(cached.map((g) => [g.topic, g]))

  res.json(
    SHARED_TOPICS.map((topic) => {
      const cg = byTopic.get(topic)
      return {
        id: cg?.id ?? `${topic}::${level}`,
        topic,
        level,
        title: titleCase(topic),
        flashcardCount: cg?.flashcards.length ?? WORDS_PER_GROUP,
        cached: !!cg,
      }
    })
  )
})

// Generates (if not cached) and copies a shared group to the user's collection.
// Fully try/catch: unhandled rejections on Vercel often return a raw error with no CORS headers,
// which the browser reports as a CORS failure even when the real issue is AI/DB/timeout.
sharedRouter.post('/start', requireAuth, async (req, res) => {
  const { topic } = req.body as { topic?: string }
  const level = String(req.body.level || 'B1').toUpperCase()

  try {
    if (!topic || !SHARED_TOPICS.includes(topic)) {
      return res.status(400).json({ error: 'Invalid topic' })
    }
    if (!VALID_LEVELS.has(level)) {
      return res.status(400).json({ error: 'Invalid level' })
    }

    const alreadyCopied = await prisma.flashcardGroup.findFirst({
      where: { userId: req.userId, sharedTopic: topic },
      include: { flashcards: true },
    })
    if (alreadyCopied) return res.json(alreadyCopied)

    let shared = await prisma.sharedGroup.findUnique({
      where: { topic_level: { topic, level } },
      include: { flashcards: true },
    })

    if (!shared) {
      const cards = await generateFlashcards(
        topic, level, WORDS_PER_GROUP,
        'translation', 'English', 'Ukrainian',
      )
      shared = await prisma.sharedGroup.create({
        data: {
          topic,
          level,
          title: titleCase(topic),
          flashcards: {
            create: cards.map((c) => ({
              english: c.english,
              back: c.back,
              backKind: c.backKind,
              pronunciation: c.pronunciation,
              partOfSpeech: c.partOfSpeech,
              exampleSentence: c.exampleSentence,
            })),
          },
        },
        include: { flashcards: true },
      })
    }

    const group = await prisma.flashcardGroup.create({
      data: {
        title: shared.title,
        mode: 'translation',
        frontLang: 'English',
        backLang: 'Ukrainian',
        sharedTopic: topic,
        userId: req.userId!,
        flashcards: {
          create: shared.flashcards.map((c) => ({
            english: c.english,
            back: c.back,
            backKind: c.backKind,
            pronunciation: c.pronunciation,
            partOfSpeech: c.partOfSpeech,
            exampleSentence: c.exampleSentence,
          })),
        },
      },
      include: { flashcards: true },
    })

    return res.status(201).json(group)
  } catch (err: unknown) {
    const status = (err as { status?: number }).status
    const msg = err instanceof Error ? err.message : String(err)

    if (status === 429 || msg.toLowerCase().includes('quota')) {
      return res.status(429).json({ error: 'Rate limit reached. Please wait and try again.' })
    }
    if (status === 401 || status === 403 || msg.includes('API key')) {
      return res.status(502).json({ error: 'AI service configuration error.' })
    }

    console.error('shared-groups/start:', msg)
    return res.status(502).json({
      error: 'Could not start this topic. Please try again.',
    })
  }
})

sharedRouter.post('/update-level', requireAuth, async (req, res) => {
  const { level } = req.body as { level?: string }
  if (!level || !VALID_LEVELS.has(level.toUpperCase())) {
    return res.status(400).json({ error: 'Invalid level' })
  }

  const userSharedGroups = await prisma.flashcardGroup.findMany({
    where: { userId: req.userId, sharedTopic: { not: null } },
    include: { flashcards: true },
  })

  const toDelete: string[] = []
  for (const g of userSharedGroups) {
    if (g.groupStatus === 'learnt') continue
    const allNew = g.flashcards.every((c) => c.status === 'new')
    if (allNew) toDelete.push(g.id)
  }

  if (toDelete.length > 0) {
    await prisma.flashcardGroup.deleteMany({
      where: { id: { in: toDelete } },
    })
  }

  res.json({ deleted: toDelete.length })
})
