import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, RotateCcw, Square, Play } from 'lucide-react'
import type { GameSessionSummary } from '../../../../shared/types/campaign'
import type {
  SessionLifecycleResponse,
  SessionWorkflowState,
} from '../../../../shared/types/session-workflow'
import { getJson, sendJson } from './api'

export function SessionLifecycleControl({
  campaignId,
  sessionId,
  onReturnToLobby,
}: {
  campaignId: string
  sessionId?: string
  onReturnToLobby?: () => void
}) {
  const [session, setSession] = useState<GameSessionSummary | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!sessionId) return
    try {
      const workflow = await getJson<SessionWorkflowState>(
        `/campaigns/${encodeURIComponent(campaignId)}/workflow`,
      )
      setSession(
        workflow.sessions.find((candidate) => candidate.id === sessionId) ?? null,
      )
    } catch (refreshError) {
      setError(messageFrom(refreshError))
    }
  }, [campaignId, sessionId])

  useEffect(() => {
    if (!sessionId) return
    const timer = window.setTimeout(() => void refresh(), 0)
    return () => window.clearTimeout(timer)
  }, [refresh, sessionId])

  async function transition(action: 'start' | 'end' | 'reopen') {
    if (!sessionId) return
    setBusy(true)
    setError('')
    try {
      const response = await sendJson<SessionLifecycleResponse>(
        `/campaigns/${encodeURIComponent(campaignId)}/workflow/sessions/${encodeURIComponent(sessionId)}/${action}`,
        'POST',
        {},
      )
      setSession(response.session)
    } catch (transitionError) {
      setError(messageFrom(transitionError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="session-lifecycle">
      <button
        type="button"
        className="icon-button"
        title="Volver al lobby"
        aria-label="Volver al lobby"
        onClick={onReturnToLobby}
      >
        <ArrowLeft size={18} />
      </button>

      <span className={`phase-badge phase-badge--${session?.phase ?? 'preparation'}`}>
        {session?.phase === 'live'
          ? 'En vivo'
          : session?.phase === 'ended'
            ? 'Finalizada'
            : 'Preparación'}
      </span>

      {session?.phase === 'live' ? (
        <button
          type="button"
          className="danger-action"
          disabled={busy}
          onClick={() => void transition('end')}
        >
          <Square size={15} />
          Finalizar
        </button>
      ) : session?.phase === 'ended' ? (
        <button
          type="button"
          className="secondary-action"
          disabled={busy}
          onClick={() => void transition('reopen')}
        >
          <RotateCcw size={15} />
          Reabrir
        </button>
      ) : (
        <button
          type="button"
          disabled={busy || !session}
          onClick={() => void transition('start')}
          data-testid="start-session"
        >
          <Play size={15} />
          Iniciar
        </button>
      )}

      {error ? <span className="lifecycle-error">{error}</span> : null}
    </div>
  )
}

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : 'No se pudo cambiar la sesión'
}
