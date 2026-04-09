import styles from './LoaderDots.module.scss'

interface Props {
  size?: 'sm' | 'md'
  className?: string
}

export function LoaderDots({ size = 'md', className }: Props) {
  return (
    <span
      className={`${styles.dots} ${size === 'sm' ? styles.sm : ''} ${className ?? ''}`}
      aria-label="Loading"
    >
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
    </span>
  )
}
