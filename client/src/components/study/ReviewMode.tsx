import { useCallback, useState } from 'react'
import type { Flashcard } from '../../types'
import { FlashcardFlip } from '../FlashcardFlip'
import { usePatchFlashcardMutation } from '../../services/api'
import styles from './StudyModes.module.scss'

export function ReviewMode({
  groupId,
  cards,
  frontLang = 'English',
}: {
  groupId: string
  cards: Flashcard[]
  frontLang?: string
}) {
  const [index, setIndex] = useState(0)
  const [flipReset, setFlipReset] = useState(0)
  const [patch] = usePatchFlashcardMutation()

  const card = cards[index]
  const total = cards.length

  const onFlip = useCallback(() => {
    if (!card) return
    if (card.status === 'new') {
      patch({ groupId, cardId: card.id, status: 'learning' })
    }
  }, [card, groupId, patch])

  if (!total) {
    return <p className={styles.empty}>Add cards to this group first.</p>
  }

  return (
    <div className={styles.mode}>
      <p className={styles.progress}>
        Card {index + 1} / {total}
      </p>
      <FlashcardFlip
        key={`${card.id}-${flipReset}`}
        front={card.english}
        back={card.back}
        pronunciation={card.pronunciation}
        partOfSpeech={card.partOfSpeech}
        exampleSentence={card.exampleSentence}
        lang={frontLang}
        onFlip={onFlip}
      />
      <div className={styles.nav}>
        <button
          type="button"
          className={styles.btn}
          disabled={index === 0}
          onClick={() => {
            setIndex((i) => i - 1)
            setFlipReset((k) => k + 1)
          }}
        >
          Previous
        </button>
        <button
          type="button"
          className={styles.btnPrimary}
          disabled={index >= total - 1}
          onClick={() => {
            setIndex((i) => i + 1)
            setFlipReset((k) => k + 1)
          }}
        >
          Next
        </button>
      </div>
    </div>
  )
}
