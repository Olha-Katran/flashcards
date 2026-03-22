import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DbShape, FlashcardGroup } from './types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = join(__dirname, '..', 'data', 'db.json')

async function ensureDataFile(): Promise<void> {
  await mkdir(dirname(DATA_PATH), { recursive: true })
  try {
    await readFile(DATA_PATH, 'utf-8')
  } catch {
    const initial: DbShape = { groups: [] }
    await writeFile(DATA_PATH, JSON.stringify(initial, null, 2), 'utf-8')
  }
}

export async function readDb(): Promise<DbShape> {
  await ensureDataFile()
  const raw = await readFile(DATA_PATH, 'utf-8')
  return JSON.parse(raw) as DbShape
}

export async function writeDb(db: DbShape): Promise<void> {
  await ensureDataFile()
  await writeFile(DATA_PATH, JSON.stringify(db, null, 2), 'utf-8')
}

export function findGroup(db: DbShape, id: string): FlashcardGroup | undefined {
  return db.groups.find((g) => g.id === id)
}
