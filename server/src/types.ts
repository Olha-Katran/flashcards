export type BackKind = 'translation' | 'meaning'
export type FlashcardStatus = 'new' | 'learning' | 'learnt'
export type GroupStatus = 'in_progress' | 'learnt'
export type GroupMode = 'translation' | 'definition'
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
  contentKind: ContentKind
  frontLang: string
  backLang: string
  flashcards: Flashcard[]
}

export interface GroupSummary {
  id: string
  title: string
  groupStatus: GroupStatus
  mode: GroupMode
  contentKind: ContentKind
  frontLang: string
  backLang: string
  flashcardCount: number
}

export interface DbShape {
  groups: FlashcardGroup[]
}

export interface AiGenerateBody {
  topic: string
  englishLevel: string
  count: number
  mode?: GroupMode
  contentKind?: ContentKind
  frontLang?: string
  backLang?: string
  preferences?: string
}

export interface FlashcardDraft {
  english: string
  back: string
  backKind: BackKind
  pronunciation?: string
  partOfSpeech?: string
  exampleSentence?: string
}
