import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useEnglishLevel } from './useEnglishLevel'
import {
  useDeleteGroupMutation,
  useListGroupsQuery,
  useListSharedGroupsQuery,
  useStartSharedGroupMutation,
} from '../services/api'

export function useDashboardPage() {
  const { user } = useAuth()
  const { level } = useEnglishLevel()
  const navigate = useNavigate()

  const { currentData: groups, isLoading, isFetching, isError } = useListGroupsQuery(user?.id, {
    skip: !user,
  })
  const { data: sharedGroups } = useListSharedGroupsQuery(level)
  const [deleteGroup] = useDeleteGroupMutation()
  const [startShared] = useStartSharedGroupMutation()

  const [authOpen, setAuthOpen] = useState(false)
  const [startingTopic, setStartingTopic] = useState<string | null>(null)

  const startedTopics = useMemo(
    () => new Set((groups ?? []).filter((g) => g.sharedTopic).map((g) => g.sharedTopic!)),
    [groups]
  )

  const visibleShared = useMemo(
    () => (sharedGroups ?? []).filter((sg) => !startedTopics.has(sg.topic)),
    [sharedGroups, startedTopics]
  )

  const deleteGroupById = useCallback(
    async (id: string) => {
      if (!confirm('Delete this group?')) return
      try {
        await deleteGroup(id).unwrap()
      } catch {
        alert('Could not delete')
      }
    },
    [deleteGroup]
  )

  const startSharedTopic = useCallback(
    async (topic: string) => {
      if (!user) {
        setAuthOpen(true)
        return
      }
      setStartingTopic(topic)
      try {
        const group = await startShared({ topic, level }).unwrap()
        navigate(`/groups/${group.id}`)
      } catch {
        alert('Could not start group. Please try again.')
      } finally {
        setStartingTopic(null)
      }
    },
    [user, startShared, level, navigate]
  )

  return {
    user,
    level,
    groups,
    isLoading,
    isFetching,
    isError,
    visibleShared,
    authOpen,
    setAuthOpen,
    startingTopic,
    deleteGroupById,
    startSharedTopic,
  }
}
