import { HorizontalInfiniteRow } from '../../components/HorizontalInfiniteRow/HorizontalInfiniteRow'
import { GroupCard } from '../../components/GroupCard'
import type { GroupSummary } from '../../types'

type Props = {
  groups: GroupSummary[]
  onDeleteGroup: (id: string) => void
}

export function UserGroupsCarousel({ groups, onDeleteGroup }: Props) {
  return (
    <HorizontalInfiniteRow
      ariaLabel="Your groups"
      items={groups}
      itemKey={(g) => g.id}
      renderItem={(g) => <GroupCard group={g} onDelete={onDeleteGroup} />}
    />
  )
}
