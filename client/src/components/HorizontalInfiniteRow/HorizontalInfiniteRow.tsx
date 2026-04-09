import { useEffect, useRef, useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import styles from './HorizontalInfiniteRow.module.scss'

export function HorizontalInfiniteRow<T>({
  items,
  itemKey,
  renderItem,
  ariaLabel,
}: {
  items: T[]
  itemKey: (item: T, idx: number) => string
  renderItem: (item: T) => React.ReactNode
  ariaLabel: string
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  /** Resting scrollLeft for this row (scroll-snap can make “start” ≠ 0). Only reset when items change or overflow clears. */
  const scrollStartRef = useRef(0)
  const lastItemsLenRef = useRef(-1)
  const [stepPx, setStepPx] = useState(320)
  const [canScroll, setCanScroll] = useState(false)
  const [fadeLeft, setFadeLeft] = useState(false)
  const [fadeRight, setFadeRight] = useState(false)

  /**
   * Edge fades + arrow visibility stay in sync:
   * - Left fade / left arrow: only when scrolled past the laid-out start (can scroll back).
   * - Right fade / right arrow: only when more content exists to the right (not at end).
   */
  function updateScrollShades() {
    const cur = scrollerRef.current
    if (!cur) return
    const maxScroll = cur.scrollWidth - cur.clientWidth
    const hasOverflow = maxScroll > 0.5
    if (!hasOverflow) {
      setFadeLeft(false)
      setFadeRight(false)
      return
    }
    const left = cur.scrollLeft
    const start = scrollStartRef.current
    const edgeEps = 2
    setFadeLeft(left > start + edgeEps)
    setFadeRight(left < maxScroll - edgeEps)
  }

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    let raf = 0

    function measure() {
      const cur = scrollerRef.current
      if (!cur) return
      const row = cur.firstElementChild as HTMLElement | null
      const firstItem = row?.querySelector(`.${styles.hItem}`) as HTMLElement | null
      const rowStyle = row ? window.getComputedStyle(row) : null
      const gap = rowStyle ? Number.parseFloat(rowStyle.columnGap || rowStyle.gap || '0') : 0
      const itemW = firstItem?.getBoundingClientRect().width ?? 280
      const nextStep = Math.max(1, Math.round(itemW + (Number.isFinite(gap) ? gap : 0)))
      setStepPx(nextStep)

      const maxScroll = cur.scrollWidth - cur.clientWidth
      const overflow = maxScroll > 0.5
      setCanScroll(overflow)

      if (!overflow) {
        cur.scrollLeft = 0
        scrollStartRef.current = 0
        lastItemsLenRef.current = items.length
      } else {
        const itemsChanged = lastItemsLenRef.current !== items.length
        if (itemsChanged) {
          lastItemsLenRef.current = items.length
          scrollStartRef.current = cur.scrollLeft
          requestAnimationFrame(() => {
            const c = scrollerRef.current
            if (!c) return
            scrollStartRef.current = c.scrollLeft
            updateScrollShades()
          })
        }
      }
      updateScrollShades()
      requestAnimationFrame(() => updateScrollShades())
    }

    raf = window.requestAnimationFrame(measure)
    const ro = new ResizeObserver(() => {
      window.cancelAnimationFrame(raf)
      raf = window.requestAnimationFrame(measure)
    })
    ro.observe(el)

    return () => {
      window.cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [items.length])

  function scrollByDir(dir: -1 | 1) {
    const el = scrollerRef.current
    if (!el || !canScroll) return
    el.scrollBy({ left: dir * stepPx, behavior: 'smooth' })
  }

  if (!items.length) return null

  return (
    <div className={styles.hWrap} aria-label={ariaLabel}>
      {canScroll && fadeLeft && (
        <button
          type="button"
          className={`${styles.hArrow} ${styles.hArrowLeft}`}
          onClick={() => scrollByDir(-1)}
          aria-label="Scroll left"
        >
          <FiChevronLeft />
        </button>
      )}
      {canScroll && fadeLeft && (
        <div
          className={`${styles.hScrollShade} ${styles.hScrollShadeLeft} ${styles.hScrollShadeVisible}`}
          aria-hidden
        />
      )}
      {canScroll && (
        <div
          className={`${styles.hScrollShade} ${styles.hScrollShadeRight} ${fadeRight ? styles.hScrollShadeVisible : ''}`}
          aria-hidden
        />
      )}
      <div
        className={`${styles.hScroller} ${canScroll ? styles.hScrollerPadded : ''}`}
        ref={scrollerRef}
        onScroll={updateScrollShades}
      >
        <div className={styles.hRow}>
          {items.map((item, idx) => (
            <div key={itemKey(item, idx)} className={styles.hItem}>
              {renderItem(item)}
            </div>
          ))}
        </div>
      </div>
      {canScroll && fadeRight && (
        <button
          type="button"
          className={`${styles.hArrow} ${styles.hArrowRight}`}
          onClick={() => scrollByDir(1)}
          aria-label="Scroll right"
        >
          <FiChevronRight />
        </button>
      )}
    </div>
  )
}
