import { useMemo, useState } from 'react'
import type { Flashcard, GroupMode } from '../../types'
import { useCompleteExamMutation, useValidateAnswerMutation } from '../../services/api'
import { normalizeAnswer } from '../../utils/string'
import { shuffle } from '../../utils/shuffle'
import styles from './StudyModes.module.scss'

type QType = 'mcq' | 'type'

interface Question {
  card: Flashcard
  type: QType
}

export function ExamMode({
  groupId,
  cards,
  mode = 'translation',
  frontLang = 'English',
  backLang = 'Ukrainian',
}: {
  groupId: string
  cards: Flashcard[]
  mode?: GroupMode
  frontLang?: string
  backLang?: string
}) {
  const [completeExam, { isLoading: submitting }] = useCompleteExamMutation()
  const [validate, { isLoading: validating }] = useValidateAnswerMutation()
  const [started, setStarted] = useState(false)
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [mcqPick, setMcqPick] = useState<string | null>(null)
  const [typeVal, setTypeVal] = useState('')
  const [finished, setFinished] = useState(false)
  const [serverMsg, setServerMsg] = useState<string | null>(null)
  const [typeVerdict, setTypeVerdict] = useState<{
    correct: boolean
    feedback: string
  } | null>(null)

  const typePrompt = mode === 'definition'
    ? 'Type the definition:'
    : `Type the ${backLang} translation:`

  const questions = useMemo(() => {
    const qs: Question[] = cards.map((card) => ({
      card,
      type: (Math.random() > 0.45 ? 'mcq' : 'type') as QType,
    }))
    return shuffle(qs)
  }, [cards])

  const q = questions[index]
  const totalQ = questions.length

  const mcqOptions = useMemo(() => {
    if (!q || q.type !== 'mcq') return [] as string[]
    const card = q.card
    if (cards.length < 2) return [card.back]
    const others = cards
      .filter((c) => c.id !== card.id)
      .map((c) => c.back)
    const pool = shuffle([...others])
    return shuffle([card.back, ...pool.slice(0, 3)])
  }, [q, cards])

  if (!cards.length) {
    return <p className={styles.empty}>Add cards before taking an exam.</p>
  }

  if (!started) {
    return (
      <div className={styles.examStart}>
        <h2>Exam</h2>
        <p>
          Mixed multiple choice and typing questions. Your score is saved to the
          server; groups with <strong>&gt; 90%</strong> are marked as learnt.
        </p>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={() => setStarted(true)}
        >
          Start
        </button>
      </div>
    )
  }

  if (finished || index >= totalQ) {
    const score = totalQ ? correct / totalQ : 0
    const pct = Math.round(score * 100)
    return (
      <div className={styles.results}>
        <h2>Results</h2>
        <p className={styles.scoreLine}>
          {correct} / {totalQ} correct ({pct}%)
        </p>
        {pct > 90 ? (
          <p className={styles.ok}>Outstanding — group can be marked learnt.</p>
        ) : (
          <p className={styles.muted}>Reach above 90% to mark the group learnt.</p>
        )}
        {serverMsg && <p className={styles.muted}>{serverMsg}</p>}
        <button
          type="button"
          className={styles.btnPrimary}
          disabled={submitting}
          onClick={async () => {
            try {
              const res = await completeExam({ groupId, score }).unwrap()
              setServerMsg(
                res.passed
                  ? 'Group status updated to learnt.'
                  : 'Score saved. Keep practicing!'
              )
            } catch {
              setServerMsg('Could not save score.')
            }
          }}
        >
          {submitting ? 'Saving…' : 'Save score'}
        </button>
        <button
          type="button"
          className={styles.btn}
          onClick={() => {
            setStarted(false)
            setIndex(0)
            setCorrect(0)
            setFinished(false)
            setMcqPick(null)
            setTypeVal('')
            setServerMsg(null)
            setTypeVerdict(null)
          }}
        >
          Retake
        </button>
      </div>
    )
  }

  if (!q) return null

  const card = q.card

  function advance(wasCorrect: boolean) {
    if (wasCorrect) setCorrect((c) => c + 1)
    setMcqPick(null)
    setTypeVal('')
    setTypeVerdict(null)
    if (index + 1 >= totalQ) {
      setFinished(true)
    } else {
      setIndex((i) => i + 1)
    }
  }

  if (q.type === 'mcq') {
    const picked =
      mcqPick !== null &&
      normalizeAnswer(mcqPick) === normalizeAnswer(card.back)
    return (
      <div className={styles.mode}>
        <p className={styles.progress}>
          Question {index + 1} / {totalQ} · Multiple choice
        </p>
        <div className={styles.panel}>
          <p className={styles.word}>{card.english}</p>
          <div className={styles.options}>
            {mcqOptions.map((opt, i) => (
              <button
                key={`${opt}-${i}`}
                type="button"
                className={
                  mcqPick === opt
                    ? picked
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
            disabled={mcqPick === null}
            onClick={() => advance(!!picked)}
          >
            Next
          </button>
        </div>
      </div>
    )
  }

  async function handleCheckExamAnswer() {
    try {
      const res = await validate({
        userAnswer: typeVal,
        correctAnswer: card.back,
        englishWord: card.english,
        mode,
        frontLang,
        backLang,
      }).unwrap()
      setTypeVerdict(res)
    } catch {
      setTypeVerdict({ correct: false, feedback: 'Validation error.' })
    }
  }

  return (
    <div className={styles.mode}>
      <p className={styles.progress}>
        Question {index + 1} / {totalQ} · Typing
      </p>
      <div className={styles.panel}>
        <p className={styles.prompt}>{typePrompt}</p>
        <p className={styles.word}>{card.english}</p>
        <input
          className={styles.input}
          value={typeVal}
          onChange={(e) => {
            setTypeVal(e.target.value)
            if (typeVerdict) setTypeVerdict(null)
          }}
          placeholder="Your answer"
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && typeVal.trim() && !typeVerdict && !validating) {
              handleCheckExamAnswer()
            }
          }}
        />
        {typeVerdict && (
          <p className={typeVerdict.correct ? styles.ok : styles.bad}>
            {typeVerdict.correct ? 'Correct!' : typeVerdict.feedback}
          </p>
        )}
        {typeVerdict?.correct && (
          <p className={styles.feedback}>{typeVerdict.feedback}</p>
        )}
        {!typeVerdict ? (
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={!typeVal.trim() || validating}
            onClick={handleCheckExamAnswer}
          >
            {validating ? 'Checking…' : 'Check'}
          </button>
        ) : (
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => advance(typeVerdict.correct)}
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}
