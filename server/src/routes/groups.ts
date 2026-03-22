import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import type { BackKind, Flashcard, FlashcardDraft, FlashcardGroup, FlashcardStatus, GroupMode } from '../types.js'
import { findGroup, readDb, writeDb } from '../store.js'

export const groupsRouter = Router()

function draftToFlashcard(d: FlashcardDraft): Flashcard {
  return {
    id: randomUUID(),
    english: d.english,
    back: d.back,
    backKind: d.backKind,
    status: 'new',
  }
}

function validMode(m: unknown): m is GroupMode {
  return m === 'translation' || m === 'definition'
}

groupsRouter.get('/', async (_req, res) => {
  const db = await readDb()
  const list = db.groups.map((g) => ({
    id: g.id,
    title: g.title,
    groupStatus: g.groupStatus,
    mode: g.mode ?? 'translation',
    frontLang: g.frontLang ?? 'English',
    backLang: g.backLang ?? 'Ukrainian',
    flashcardCount: g.flashcards.length,
  }))
  res.json(list)
})

groupsRouter.get('/:id', async (req, res) => {
  const db = await readDb()
  const g = findGroup(db, req.params.id)
  if (!g) return res.status(404).json({ error: 'Group not found' })
  res.json({
    ...g,
    mode: g.mode ?? 'translation',
    frontLang: g.frontLang ?? 'English',
    backLang: g.backLang ?? 'Ukrainian',
  })
})

groupsRouter.post('/', async (req, res) => {
  const { title, flashcards: rawCards, mode, frontLang, backLang } = req.body as {
    title?: string
    flashcards?: FlashcardDraft[]
    mode?: string
    frontLang?: string
    backLang?: string
  }
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'title is required' })
  }
  const groupMode: GroupMode = validMode(mode) ? mode : 'translation'
  const drafts: FlashcardDraft[] = Array.isArray(rawCards) ? rawCards : []
  const group: FlashcardGroup = {
    id: randomUUID(),
    title: title.trim(),
    groupStatus: 'in_progress',
    mode: groupMode,
    frontLang: typeof frontLang === 'string' && frontLang.trim() ? frontLang.trim() : 'English',
    backLang: typeof backLang === 'string' && backLang.trim()
      ? backLang.trim()
      : groupMode === 'definition' ? 'English' : 'Ukrainian',
    flashcards: drafts.map(draftToFlashcard),
  }
  const db = await readDb()
  db.groups.push(group)
  await writeDb(db)
  res.status(201).json(group)
})

groupsRouter.put('/:id', async (req, res) => {
  const db = await readDb()
  const idx = db.groups.findIndex((g) => g.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Group not found' })
  const { title, flashcards: rawCards, mode, frontLang, backLang } = req.body as {
    title?: string
    flashcards?: FlashcardDraft[]
    mode?: string
    frontLang?: string
    backLang?: string
  }
  if (title !== undefined && typeof title !== 'string') {
    return res.status(400).json({ error: 'invalid title' })
  }
  const g = db.groups[idx]
  if (title !== undefined) g.title = title.trim()
  if (validMode(mode)) g.mode = mode
  if (typeof frontLang === 'string' && frontLang.trim()) g.frontLang = frontLang.trim()
  if (typeof backLang === 'string' && backLang.trim()) g.backLang = backLang.trim()
  if (rawCards !== undefined) {
    if (!Array.isArray(rawCards)) return res.status(400).json({ error: 'flashcards must be an array' })
    type In = FlashcardDraft & { id?: string; status?: FlashcardStatus }
    g.flashcards = (rawCards as In[]).map((d) => {
      if (d.id && typeof d.id === 'string') {
        const existing = g.flashcards.find((c) => c.id === d.id)
        if (existing) {
          return {
            ...existing,
            english: d.english ?? existing.english,
            back: d.back ?? existing.back,
            backKind: (d.backKind ?? existing.backKind) as BackKind,
            status: (d.status ?? existing.status) as Flashcard['status'],
          }
        }
      }
      const draft: FlashcardDraft = {
        english: d.english,
        back: d.back,
        backKind: d.backKind,
      }
      return draftToFlashcard(draft)
    })
  }
  await writeDb(db)
  res.json(g)
})

groupsRouter.delete('/:id', async (req, res) => {
  const db = await readDb()
  const before = db.groups.length
  db.groups = db.groups.filter((g) => g.id !== req.params.id)
  if (db.groups.length === before) return res.status(404).json({ error: 'Group not found' })
  await writeDb(db)
  res.status(204).send()
})

groupsRouter.patch('/:groupId/flashcards/:cardId', async (req, res) => {
  const { groupId, cardId } = req.params
  const { status } = req.body as { status?: string }
  const db = await readDb()
  const g = findGroup(db, groupId)
  if (!g) return res.status(404).json({ error: 'Group not found' })
  const card = g.flashcards.find((c) => c.id === cardId)
  if (!card) return res.status(404).json({ error: 'Flashcard not found' })
  if (status && ['new', 'learning', 'learnt'].includes(status)) {
    card.status = status as Flashcard['status']
  }
  await writeDb(db)
  res.json(card)
})

groupsRouter.post('/:id/exam/complete', async (req, res) => {
  const { score } = req.body as { score?: number }
  if (typeof score !== 'number' || score < 0 || score > 1) {
    return res.status(400).json({ error: 'score must be a number between 0 and 1' })
  }
  const db = await readDb()
  const g = findGroup(db, req.params.id)
  if (!g) return res.status(404).json({ error: 'Group not found' })
  if (score > 0.9) g.groupStatus = 'learnt'
  await writeDb(db)
  res.json({ group: g, passed: score > 0.9 })
})
