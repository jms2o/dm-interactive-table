import { useEffect, useState, type ReactNode } from 'react'
import { Clock3, LogOut, Monitor, Radio, Swords } from 'lucide-react'
import type { AuthPrincipal } from '../../../../shared/types/auth'
import type { GameSessionSummary } from '../../../../shared/types/campaign'
import type { ClientRole } from '../../../../shared/types/realtime'
import type { SessionWorkflowState } from '../../../../shared/types/session-workflow'
import { CharacterSheetPanel } from './CharacterSheetPanel'
import { getJson } from './api'

export function SessionBoundary({
  role,
  principal,
  onLogout,
  children,
}: {
  role: ClientRole
  principal: AuthPrincipal
  onLogout: () => void | Promise<void>
  children: ReactNode
}) {
  const [session, setSession] = useState<GameSessionSummary | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function refresh() {
      try {
        const workflow = await getJson<SessionWorkflowState>(
          `/campaigns/${encodeURIComponent(principal.campaignId)}/workflow`,
        )
        const nextSession = workflow.sessions.find(
          (candidate) => candidate.id === principal.sessionId,
        )
        if (active) {
          setSession(nextSession ?? null)
          setError(nextSession ? '' : 'La sesión ya no está disponible')
        }
      } catch (refreshError) {
        if (active) setError(messageFrom(refreshError))
      }
    }

    void refresh()
    const timer = window.setInterval(() => void refresh(), 2500)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [principal.campaignId, principal.sessionId])

  if (session?.phase === 'live') return children

  const ended = session?.phase === 'ended'
  const RoleIcon = role === 'display' ? Monitor : Swords

  return (
    <main className={`waiting-shell waiting-shell--${role}`}>
      <header className="waiting-topbar">
        <div className="lobby-brand">
          <span className="auth-mark" aria-hidden="true">
            <RoleIcon size={22} />
          </span>
          <div>
            <span className="eyebrow">DM Interactive Table</span>
            <h1>{session?.title ?? 'Conectando con la sesión'}</h1>
          </div>
        </div>
        <button
          type="button"
          className="icon-button"
          title="Salir de la mesa"
          aria-label="Salir de la mesa"
          onClick={() => void onLogout()}
        >
          <LogOut size={18} />
        </button>
      </header>

      <section className="waiting-content">
        <div className="waiting-status">
          {ended ? <Clock3 size={28} /> : <Radio size={28} />}
          <span className="section-label">
            {ended ? 'Sesión finalizada' : 'Sala de espera'}
          </span>
          <h2>
            {ended
              ? 'La mesa quedó cerrada'
              : 'El DM está preparando la partida'}
          </h2>
          <p>
            {ended
              ? session?.summaryPublic || 'El estado de la sesión quedó guardado.'
              : 'Entrarás automáticamente cuando la sesión comience.'}
          </p>
          {error ? <p className="auth-error">{error}</p> : null}
        </div>

        {role === 'player' ? (
          <CharacterSheetPanel campaignId={principal.campaignId} />
        ) : (
          <div className="display-ready-indicator">
            <Monitor size={30} />
            <strong>Display listo</strong>
          </div>
        )}
      </section>
    </main>
  )
}

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : 'No se pudo consultar la sesión'
}
