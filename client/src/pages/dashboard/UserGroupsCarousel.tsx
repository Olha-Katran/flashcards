import { HorizontalInfiniteRow } from '../../components/HorizontalInfiniteRow/HorizontalInfiniteRow'
import { GroupCard } from '../../components/GroupCard'
import type { GroupSummary } from '../../types'

type Props = {
  groups: GroupSummary[]
  onDeleteGroup: (id: string) => void
  /** Accessible name for the horizontal scroller (e.g. status-specific row). */
  carouselAriaLabel?: string
}

export function UserGroupsCarousel({ groups, onDeleteGroup, carouselAriaLabel = 'Your groups' }: Props) {
  return (
    <HorizontalInfiniteRow
      ariaLabel={carouselAriaLabel}
      items={groups}
      itemKey={(g) => g.id}
      renderItem={(g) => <GroupCard group={g} onDelete={onDeleteGroup} />}
    />
  )
}
