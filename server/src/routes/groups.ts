import { Router } from 'express'
import type { BackKind, FlashcardStatus, GroupMode } from '../types.js'
import { prisma } from '../prisma.js'

export const groupsRouter = Router()

function validMode(m: unknown): m is GroupMode {
  return m === 'translation' || m === 'definition'
}

groupsRouter.get('/', async (_req, res) => {
  const groups = await prisma.flashcardGroup.findMany({
    include: { _count: { select: { flashcards: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(
    groups.map((g) => ({
      id: g.id,
      title: g.title,
      groupStatus: g.groupStatus,
      mode: g.mode,
      frontLang: g.frontLang,
      backLang: g.backLang,
      flashcardCount: g._count.flashcards,
    }))
  )
})

groupsRouter.get('/:id', async (req, res) => {
  const g = await prisma.flashcardGroup.findUnique({
    where: { id: req.params.id },
    include: { flashcards: true },
  })
  if (!g) return res.status(404).json({ error: 'Group not found' })
  res.json(g)
})

groupsRouter.post('/', async (req, res) => {
  const { title, flashcards: rawCards, mode, frontLang, backLang } = req.body as {
    title?: string
    flashcards?: Array<{
      english: string
      back: string
      backKind?: string
      pronunciation?: string
      partOfSpeech?: string
      exampleSentence?: string
    }>
    mode?: string
    frontLang?: string
    backLang?: string
  }
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'title is required' })
  }
  const groupMode: GroupMode = validMode(mode) ? mode : 'translation'
  const cards = Array.isArray(rawCards) ? rawCards : []

  const group = await prisma.flashcardGroup.create({
    data: {
      title: title.trim(),
      mode: groupMode,
      frontLang: typeof frontLang === 'string' && frontLang.trim() ? frontLang.trim() : 'English',
      backLang: typeof backLang === 'string' && backLang.trim()
        ? backLang.trim()
        : groupMode === 'definition' ? 'English' : 'Ukrainian',
      flashcards: {
        create: cards.map((c) => ({
          english: c.english,
          back: c.back,
          backKind: c.backKind ?? 'translation',
          pronunciation: c.pronunciation,
          partOfSpeech: c.partOfSpeech,
          exampleSentence: c.exampleSentence,
        })),
      },
    },
    include: { flashcards: true },
  })

  res.status(201).json(group)
})

groupsRouter.put('/:id', async (req, res) => {
  const existing = await prisma.flashcardGroup.findUnique({
    where: { id: req.params.id },
    include: { flashcards: true },
  })
  if (!existing) return res.status(404).json({ error: 'Group not found' })

  const { title, flashcards: rawCards, mode, frontLang, backLang } = req.body as {
    title?: string
    flashcards?: Array<{
      id?: string
      english: string
      back: string
      backKind?: string
      status?: string
      pronunciation?: string
      partOfSpeech?: string
      exampleSentence?: string
    }>
    mode?: string
    frontLang?: string
    backLang?: string
  }

  if (title !== undefined && typeof title !== 'string') {
    return res.status(400).json({ error: 'invalid title' })
  }

  const groupUpdate: Record<string, unknown> = {}
  if (title !== undefined) groupUpdate.title = title.trim()
  if (validMode(mode)) groupUpdate.mode = mode
  if (typeof frontLang === 'string' && frontLang.trim()) groupUpdate.frontLang = frontLang.trim()
  if (typeof backLang === 'string' && backLang.trim()) groupUpdate.backLang = backLang.trim()

  if (rawCards !== undefined) {
    if (!Array.isArray(rawCards)) return res.status(400).json({ error: 'flashcards must be an array' })

    const incomingIds = rawCards.filter((c) => c.id).map((c) => c.id as string)
    const toDelete = existing.flashcards
      .filter((c) => !incomingIds.includes(c.id))
      .map((c) => c.id)

    if (toDelete.length) {
      await prisma.flashcard.deleteMany({ where: { id: { in: toDelete } } })
    }

    for (const card of rawCards) {
      if (card.id && existing.flashcards.some((c) => c.id === card.id)) {
        await prisma.flashcard.update({
          where: { id: card.id },
          data: {
            english: card.english,
            back: card.back,
            backKind: (card.backKind ?? 'translation') as BackKind,
            status: (card.status ?? 'new') as FlashcardStatus,
            pronunciation: card.pronunciation,
            partOfSpeech: card.partOfSpeech,
            exampleSentence: card.exampleSentence,
          },
        })
      } else {
        await prisma.flashcard.create({
          data: {
            english: card.english,
            back: card.back,
            backKind: (card.backKind ?? 'translation') as BackKind,
            status: 'new',
            pronunciation: card.pronunciation,
            partOfSpeech: card.partOfSpeech,
            exampleSentence: card.exampleSentence,
            groupId: existing.id,
          },
        })
      }
    }
  }

  const updated = await prisma.flashcardGroup.update({
    where: { id: req.params.id },
    data: groupUpdate,
    include: { flashcards: true },
  })

  res.json(updated)
})

groupsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.flashcardGroup.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch {
    res.status(404).json({ error: 'Group not found' })
  }
})

groupsRouter.patch('/:groupId/flashcards/:cardId', async (req, res) => {
  const { groupId, cardId } = req.params
  const { status } = req.body as { status?: string }

  const group = await prisma.flashcardGroup.findUnique({ where: { id: groupId } })
  if (!group) return res.status(404).json({ error: 'Group not found' })

  const card = await prisma.flashcard.findFirst({
    where: { id: cardId, groupId },
  })
  if (!card) return res.status(404).json({ error: 'Flashcard not found' })

  if (status && ['new', 'learning', 'learnt'].includes(status)) {
    const updated = await prisma.flashcard.update({
      where: { id: cardId },
      data: { status },
    })
    return res.json(updated)
  }

  res.json(card)
})

groupsRouter.post('/:id/exam/complete', async (req, res) => {
  const { score } = req.body as { score?: number }
  if (typeof score !== 'number' || score < 0 || score > 1) {
    return res.status(400).json({ error: 'score must be a number between 0 and 1' })
  }

  const g = await prisma.flashcardGroup.findUnique({
    where: { id: req.params.id },
    include: { flashcards: true },
  })
  if (!g) return res.status(404).json({ error: 'Group not found' })

  const passed = score > 0.9
  if (passed) {
    await prisma.flashcardGroup.update({
      where: { id: req.params.id },
      data: { groupStatus: 'learnt' },
    })
  }

  const updated = await prisma.flashcardGroup.findUnique({
    where: { id: req.params.id },
    include: { flashcards: true },
  })

  res.json({ group: updated, passed })
})
