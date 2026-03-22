export type BackKind = 'translation' | 'meaning'
export type FlashcardStatus = 'new' | 'learning' | 'learnt'
export type GroupStatus = 'in_progress' | 'learnt'
export type GroupMode = 'translation' | 'definition'

export interface Flashcard {
  id: string
  english: string
  back: string
  backKind: BackKind
  status: FlashcardStatus
}

export interface FlashcardGroup {
  id: string
  title: string
  groupStatus: GroupStatus
  mode: GroupMode
  frontLang: string
  backLang: string
  flashcards: Flashcard[]
}

export interface GroupSummary {
  id: string
  title: string
  groupStatus: GroupStatus
  mode: GroupMode
  frontLang: string
  backLang: string
  flashcardCount: number
}

export interface FlashcardDraft {
  english: string
  back: string
  backKind: BackKind
}

export interface AiGenerateRequest {
  topic: string
  englishLevel: string
  count: number
  mode?: GroupMode
  frontLang?: string
  backLang?: string
  preferences?: string
}
