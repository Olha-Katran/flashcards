import type { GroupSummary, SharedGroupSummary } from '../types'

/** URL query key for dashboard list search (shared by `Header` and `DashboardPage`). */
export const DASHBOARD_SEARCH_QUERY_PARAM = 'q'

export function groupMatchesDashboardQuery(group: GroupSummary, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return true
  if (group.title.toLowerCase().includes(q)) return true
  if (group.sharedTopic?.toLowerCase().includes(q)) return true
  return false
}

export function sharedTopicMatchesDashboardQuery(sg: SharedGroupSummary, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return true
  return (
    sg.title.toLowerCase().includes(q) ||
    sg.topic.toLowerCase().includes(q) ||
    sg.level.toLowerCase().includes(q)
  )
}
