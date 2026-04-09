import { useCallback, useEffect, useMemo, useState } from 'react'
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

  // Keep a stable order even when the server refetches after status updates.
  const ordered = useMemo(
    () => [...cards].sort((a, b) => a.id.localeCompare(b.id)),
    [cards]
  )

  const total = ordered.length
  const card = ordered[index]

  const goPrev = useCallback(() => {
    if (index === 0) return
    setIndex((i) => i - 1)
    setFlipReset((k) => k + 1)
  }, [index])

  const goNext = useCallback(() => {
    if (index >= total - 1) return
    setIndex((i) => i + 1)
    setFlipReset((k) => k + 1)
  }, [index, total])

  useEffect(() => {
    // If total shrinks or order changes, clamp index.
    if (index > total - 1) setIndex(Math.max(0, total - 1))
  }, [index, total])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goNext, goPrev])

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
        autoFocus
      />
      <div className={styles.nav}>
        <button
          type="button"
          className={styles.btn}
          disabled={index === 0}
          onClick={goPrev}
        >
          Previous
        </button>
        <button
          type="button"
          className={styles.btnPrimary}
          disabled={index >= total - 1}
          onClick={goNext}
        >
          Next
        </button>
      </div>
    </div>
  )
}
