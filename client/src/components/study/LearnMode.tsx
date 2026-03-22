import { useMemo, useState } from 'react'
import type { Flashcard, GroupMode } from '../../types'
import { FlashcardFlip } from '../FlashcardFlip'
import { normalizeAnswer } from '../../utils/string'
import { shuffle } from '../../utils/shuffle'
import { useValidateAnswerMutation } from '../../services/api'
import styles from './StudyModes.module.scss'

type Phase = 'flip' | 'mcq' | 'type'
type Verdict = { correct: boolean; feedback: string } | null

export function LearnMode({
  cards,
  mode = 'translation',
  frontLang = 'English',
  backLang = 'Ukrainian',
}: {
  cards: Flashcard[]
  mode?: GroupMode
  frontLang?: string
  backLang?: string
}) {
  const [cardIndex, setCardIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('flip')
  const [flipKey, setFlipKey] = useState(0)
  const [mcqPick, setMcqPick] = useState<string | null>(null)
  const [typeVal, setTypeVal] = useState('')
  const [mcqShown, setMcqShown] = useState<string[]>([])
  const [verdict, setVerdict] = useState<Verdict>(null)
  const [validate, { isLoading: validating }] = useValidateAnswerMutation()

  const card = cards[cardIndex]
  const total = cards.length

  const typePrompt = mode === 'definition'
    ? 'Type the definition:'
    : `Type the ${backLang} translation:`

  const mcqOptions = useMemo(() => {
    if (!card || cards.length < 2) return [card?.back].filter(Boolean) as string[]
    const others = cards
      .filter((c) => c.id !== card.id)
      .map((c) => c.back)
    const pool = shuffle([...others])
    const distractors = pool.slice(0, 3)
    while (distractors.length < 3 && pool.length > distractors.length) {
      distractors.push(pool[distractors.length])
    }
    return shuffle([card.back, ...distractors.slice(0, 3)])
  }, [card, cards])

  if (!total) {
    return <p className={styles.empty}>Add at least one card to learn.</p>
  }

  if (cardIndex >= total) {
    return (
      <div className={styles.done}>
        <h2>Lesson complete</h2>
        <p>You finished all cards in this session.</p>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={() => {
            setCardIndex(0)
            setPhase('flip')
            setFlipKey((k) => k + 1)
            setMcqPick(null)
            setTypeVal('')
            setVerdict(null)
          }}
        >
          Start over
        </button>
      </div>
    )
  }

  function nextPhase() {
    if (phase === 'flip') {
      if (cards.length < 2) {
        setPhase('type')
        setTypeVal('')
        setVerdict(null)
      } else {
        setPhase('mcq')
        setMcqPick(null)
        setMcqShown(mcqOptions)
      }
    } else if (phase === 'mcq') {
      setPhase('type')
      setTypeVal('')
      setVerdict(null)
    } else {
      setCardIndex((i) => i + 1)
      setPhase('flip')
      setFlipKey((k) => k + 1)
      setMcqPick(null)
      setTypeVal('')
      setVerdict(null)
    }
  }

  const mcqCorrect =
    mcqPick !== null && card && normalizeAnswer(mcqPick) === normalizeAnswer(card.back)

  async function handleCheckAnswer() {
    if (!card || !typeVal.trim()) return
    try {
      const res = await validate({
        userAnswer: typeVal,
        correctAnswer: card.back,
        englishWord: card.english,
        mode,
        frontLang,
        backLang,
      }).unwrap()
      setVerdict(res)
    } catch {
      setVerdict({ correct: false, feedback: 'Validation error — try again.' })
    }
  }

  return (
    <div className={styles.mode}>
      <p className={styles.progress}>
        Card {cardIndex + 1} / {total} ·{' '}
        {phase === 'flip' ? 'Flip' : phase === 'mcq' ? 'Quiz' : 'Type'}
      </p>

      {phase === 'flip' && (
        <>
          <FlashcardFlip
            key={`${card.id}-learn-${flipKey}`}
            front={card.english}
            back={card.back}
          />
          <button type="button" className={styles.btnPrimary} onClick={nextPhase}>
            {cards.length < 2 ? 'Continue to typing' : 'Continue to quiz'}
          </button>
        </>
      )}

      {phase === 'mcq' && (
        <div className={styles.panel}>
          <p className={styles.prompt}>Choose the correct answer:</p>
          <p className={styles.word}>{card.english}</p>
          <div className={styles.options}>
            {(mcqShown.length ? mcqShown : mcqOptions).map((opt, i) => (
              <button
                key={`${opt}-${i}`}
                type="button"
                className={
                  mcqPick === opt
                    ? mcqCorrect
                      ? styles.optOk
                      : styles.optBad
                    : styles.opt
                }
                onClick={() => setMcqPick(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={!mcqPick || !mcqCorrect}
            onClick={nextPhase}
          >
            Continue to typing
          </button>
        </div>
      )}

      {phase === 'type' && (
        <div className={styles.panel}>
          <p className={styles.prompt}>{typePrompt}</p>
          <p className={styles.word}>{card.english}</p>
          <input
            className={styles.input}
            value={typeVal}
            onChange={(e) => {
              setTypeVal(e.target.value)
              if (verdict) setVerdict(null)
            }}
            placeholder="Your answer"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && typeVal.trim() && !verdict && !validating) {
                handleCheckAnswer()
              }
            }}
          />
          {verdict && (
            <p className={verdict.correct ? styles.ok : styles.bad}>
              {verdict.correct ? 'Correct!' : verdict.feedback}
            </p>
          )}
          {verdict?.correct && (
            <p className={styles.feedback}>{verdict.feedback}</p>
          )}
          {!verdict ? (
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={!typeVal.trim() || validating}
              onClick={handleCheckAnswer}
            >
              {validating ? 'Checking…' : 'Check'}
            </button>
          ) : verdict.correct ? (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={nextPhase}
            >
              {cardIndex < total - 1 ? 'Next card' : 'Finish'}
            </button>
          ) : (
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={!typeVal.trim() || validating}
              onClick={handleCheckAnswer}
            >
              {validating ? 'Checking…' : 'Try again'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
