import { useCallback, useEffect, useMemo, useState } from 'react'
import type { TableAccessStatus } from '../../../../../shared/types/auth'
import type {
  GameSessionSummary,
} from '../../../../../shared/types/campaign'
import type {
  SessionParticipant,
  SessionWorkflowState,
} from '../../../../../shared/types/session-workflow'
import { getJson } from '../../session/api'

export function useDmWorkspace(
  campaignId: string,
  sessionId: string | undefined,
  enabled: boolean,
) {
  const [workflow, setWorkflow] = useState<SessionWorkflowState | null>(null)
  const [tableAccess, setTableAccess] = useState<TableAccessStatus | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!enabled || !campaignId) return

    try {
      const sessionQuery = sessionId
        ? `&sessionId=${encodeURIComponent(sessionId)}`
        : ''
      const [nextWorkflow, nextTableAccess] = await Promise.all([
        getJson<SessionWorkflowState>(
          `/campaigns/${encodeURIComponent(campaignId)}/workflow`,
        ),
        getJson<TableAccessStatus>(
          `/table-access?campaignId=${encodeURIComponent(campaignId)}${sessionQuery}`,
        ),
      ])
      setWorkflow(nextWorkflow)
      setTableAccess(nextTableAccess)
      setError('')
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : 'No se pudo actualizar la sesión',
      )
    } finally {
      setLoading(false)
    }
  }, [campaignId, enabled, sessionId])

  useEffect(() => {
    if (!enabled) return
    const initialTimer = window.setTimeout(() => void refresh(), 0)
    const refreshTimer = window.setInterval(() => void refresh(), 5000)
    return () => {
      window.clearTimeout(initialTimer)
      window.clearInterval(refreshTimer)
    }
  }, [enabled, refresh])

  const session = useMemo<GameSessionSummary | null>(
    () =>
      workflow?.sessions.find((candidate) => candidate.id === sessionId) ??
      null,
    [sessionId, workflow?.sessions],
  )
  const participants = useMemo<SessionParticipant[]>(
    () => (sessionId ? workflow?.participantsBySession[sessionId] ?? [] : []),
    [sessionId, workflow?.participantsBySession],
  )
  const players = participants.filter((participant) => participant.role === 'player')
  const displays = participants.filter((participant) => participant.role === 'display')

  return {
    campaign: workflow?.campaign ?? null,
    session,
    participants,
    players,
    displays,
    tableAccess,
    loading,
    error,
    refresh,
  }
}
