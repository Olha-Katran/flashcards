export type BackKind = 'translation' | 'meaning'
export type FlashcardStatus = 'new' | 'learning' | 'learnt'
export type GroupStatus = 'in_progress' | 'learnt'
export type GroupMode = 'translation' | 'definition'
/** vocabulary = general words; phrasal_verbs = English phrasal verbs (same translation/definition modes) */
export type ContentKind = 'vocabulary' | 'phrasal_verbs'

export interface Flashcard {
  id: string
  english: string
  back: string
  backKind: BackKind
  status: FlashcardStatus
  pronunciation?: string
  partOfSpeech?: string
  exampleSentence?: string
}

export interface FlashcardGroup {
  id: string
  title: string
  groupStatus: GroupStatus
  mode: GroupMode
  /** Defaults to vocabulary when omitted (older API responses). */
  contentKind?: ContentKind
  frontLang: string
  backLang: string
  sharedTopic?: string | null
  flashcards: Flashcard[]
}

export interface GroupSummary {
  id: string
  title: string
  groupStatus: GroupStatus
  mode: GroupMode
  /** Defaults to vocabulary when omitted (older API responses). */
  contentKind?: ContentKind
  frontLang: string
  backLang: string
  sharedTopic?: string | null
  flashcardCount: number
}

export interface FlashcardDraft {
  english: string
  back: string
  backKind: BackKind
  pronunciation?: string
  partOfSpeech?: string
  exampleSentence?: string
}

export interface SharedGroupSummary {
  id: string
  topic: string
  level: string
  title: string
  flashcardCount: number
  cached: boolean
}

export interface AiGenerateRequest {
  topic: string
  englishLevel: string
  count: number
  mode?: GroupMode
  contentKind?: ContentKind
  frontLang?: string
  backLang?: string
  preferences?: string
  exclude?: string[]
}
