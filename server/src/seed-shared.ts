import 'dotenv/config'
import { prisma } from './prisma.js'
import { generateFlashcards } from './gemini.js'

const SHARED_TOPICS = [
  'physical world', 'animals', 'weather', 'body', 'appearance',
  'character', 'feelings', 'family and friends', 'around the home',
  'money', 'health', 'clothes', 'food', 'shopping', 'cooking',
  'transport', 'jobs', 'career', 'business', 'finance',
  'sport', 'books', 'films', 'music',
]

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const WORDS_PER_GROUP = 15
const MAX_RETRIES = 4
const DELAY_BETWEEN_MS = 8000

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function generateOne(
  topic: string,
  level: string,
  total: number,
  index: number,
  attempt = 1,
): Promise<boolean> {
  try {
    const cards = await generateFlashcards(
      topic, level, WORDS_PER_GROUP,
      'translation', 'English', 'Ukrainian'
    )
    await prisma.sharedGroup.create({
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
    })
    console.log(`  ✓ [${index}/${total}] ${topic} (${level})`)
    return true
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    const isRateLimit = msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')
    if (isRateLimit && attempt <= MAX_RETRIES) {
      const wait = DELAY_BETWEEN_MS * attempt
      console.log(`  ⏳ [${index}/${total}] ${topic} (${level}) — rate limited, waiting ${(wait / 1000).toFixed(0)}s (attempt ${attempt + 1}/${MAX_RETRIES + 1})...`)
      await sleep(wait)
      return generateOne(topic, level, total, index, attempt + 1)
    }
    console.error(`  ✗ [${index}/${total}] ${topic} (${level}): ${msg.slice(0, 120)}`)
    return false
  }
}

async function seed() {
  const existing = await prisma.sharedGroup.findMany({
    select: { topic: true, level: true },
  })
  const existingSet = new Set(existing.map((g) => `${g.topic}::${g.level}`))

  const tasks: { topic: string; level: string }[] = []
  for (const level of LEVELS) {
    for (const topic of SHARED_TOPICS) {
      if (!existingSet.has(`${topic}::${level}`)) {
        tasks.push({ topic, level })
      }
    }
  }

  if (tasks.length === 0) {
    console.log('All shared groups already exist. Nothing to generate.')
    return
  }

  console.log(`Generating ${tasks.length} shared groups sequentially with ${DELAY_BETWEEN_MS / 1000}s delay...\n`)

  let ok = 0
  let fail = 0
  for (let i = 0; i < tasks.length; i++) {
    const success = await generateOne(tasks[i].topic, tasks[i].level, tasks.length, i + 1)
    if (success) ok++
    else fail++
    if (i < tasks.length - 1) await sleep(DELAY_BETWEEN_MS)
  }

  console.log(`\nDone. ${ok} succeeded, ${fail} failed out of ${tasks.length}.`)
}

seed()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
