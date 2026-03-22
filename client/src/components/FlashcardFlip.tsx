import { useState } from 'react'
import { speak } from '../utils/speak'
import styles from './FlashcardFlip.module.scss'

export function FlashcardFlip({
  front,
  back,
  pronunciation,
  partOfSpeech,
  exampleSentence,
  lang,
  onFlip,
}: {
  front: string
  back: string
  pronunciation?: string
  partOfSpeech?: string
  exampleSentence?: string
  lang?: string
  onFlip?: () => void
}) {
  const [flipped, setFlipped] = useState(false)

  function toggle() {
    setFlipped((f) => !f)
    onFlip?.()
  }

  function handleSpeak(e: React.MouseEvent) {
    e.stopPropagation()
    speak(front, lang)
  }

  return (
    <div
      className={styles.wrap}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          toggle()
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
    >
      <div
        className={`${styles.inner} ${flipped ? styles.flipped : ''}`}
      >
        <div className={`${styles.face} ${styles.front}`}>
          <p className={styles.text}>{front}</p>
          {(pronunciation || partOfSpeech) && (
            <p className={styles.detail}>
              {pronunciation && <span>{pronunciation}</span>}
              {pronunciation && partOfSpeech && <span> · </span>}
              {partOfSpeech && <span>{partOfSpeech}</span>}
            </p>
          )}
          <button
            type="button"
            className={styles.speakBtn}
            onClick={handleSpeak}
            aria-label="Listen to pronunciation"
            title="Listen"
          >
            🔊
          </button>
          <span className={styles.tap}>Tap to flip</span>
        </div>
        <div className={`${styles.face} ${styles.back}`}>
          <p className={styles.text}>{back}</p>
          {exampleSentence && (
            <p className={styles.example}>"{exampleSentence}"</p>
          )}
          <span className={styles.tap}>Tap to flip</span>
        </div>
      </div>
    </div>
  )
}
