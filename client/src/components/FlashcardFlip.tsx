import { useState } from 'react'
import styles from './FlashcardFlip.module.scss'

export function FlashcardFlip({
  front,
  back,
  onFlip,
}: {
  front: string
  back: string
  onFlip?: () => void
}) {
  const [flipped, setFlipped] = useState(false)

  function toggle() {
    setFlipped((f) => !f)
    onFlip?.()
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
          <span className={styles.tap}>Tap to flip</span>
        </div>
        <div className={`${styles.face} ${styles.back}`}>
          <p className={styles.text}>{back}</p>
          <span className={styles.tap}>Tap to flip</span>
        </div>
      </div>
    </div>
  )
}
