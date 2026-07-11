import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  CalendarPlus,
  ChevronRight,
  FolderPlus,
  LogOut,
  Radio,
  RefreshCw,
  Swords,
  Users,
} from 'lucide-react'
import type { AuthSessionResponse } from '../../../../shared/types/auth'
import type {
  CampaignSummary,
  GameSessionSummary,
} from '../../../../shared/types/campaign'
import type { SessionWorkflowState } from '../../../../shared/types/session-workflow'
import { getJson, sendJson } from './api'

type SessionLobbyProps = {
  session: AuthSessionResponse
  onSelect: (session: AuthSessionResponse) => void
  onLogout: () => void | Promise<void>
}

export function SessionLobby({ session, onSelect, onLogout }: SessionLobbyProps) {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState(
    session.principal.campaignId,
  )
  const [workflow, setWorkflow] = useState<SessionWorkflowState | null>(null)
  const [campaignName, setCampaignName] = useState('Nueva campaña')
  const [sessionTitle, setSessionTitle] = useState('Próxima sesión')
  const [showCampaignForm, setShowCampaignForm] = useState(false)
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId),
    [campaigns, selectedCampaignId],
  )

  const loadCampaigns = useCallback(async () => {
    try {
      const nextCampaigns = await getJson<CampaignSummary[]>('/campaigns')
      setCampaigns(nextCampaigns)
      setSelectedCampaignId((current) =>
        nextCampaigns.some((campaign) => campaign.id === current)
          ? current
          : nextCampaigns[0]?.id ?? '',
      )
    } catch (loadError) {
      setError(messageFrom(loadError))
    }
  }, [])

  const loadWorkflow = useCallback(
    async (campaignId: string, quiet = false) => {
      try {
        const nextWorkflow = await getJson<SessionWorkflowState>(
          `/campaigns/${encodeURIComponent(campaignId)}/workflow`,
        )
        setWorkflow(nextWorkflow)
        if (!quiet) setError('')
      } catch (loadError) {
        if (!quiet) setError(messageFrom(loadError))
      }
    },
    [],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCampaigns(), 0)
    return () => window.clearTimeout(timer)
  }, [loadCampaigns])

  useEffect(() => {
    if (!selectedCampaignId) return
    const initialTimer = window.setTimeout(
      () => void loadWorkflow(selectedCampaignId),
      0,
    )
    const refreshTimer = window.setInterval(
      () => void loadWorkflow(selectedCampaignId, true),
      3000,
    )
    return () => {
      window.clearTimeout(initialTimer)
      window.clearInterval(refreshTimer)
    }
  }, [loadWorkflow, selectedCampaignId])

  async function createCampaign(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const campaign = await sendJson<CampaignSummary>('/campaigns', 'POST', {
        name: campaignName,
        ruleset: 'dnd5e',
        status: 'draft',
      })
      await loadCampaigns()
      setSelectedCampaignId(campaign.id)
      setShowCampaignForm(false)
    } catch (submissionError) {
      setError(messageFrom(submissionError))
    } finally {
      setBusy(false)
    }
  }

  async function createSession(event: FormEvent) {
    event.preventDefault()
    if (!selectedCampaignId) return
    setBusy(true)
    setError('')
    try {
      await sendJson<GameSessionSummary>(
        `/campaigns/${encodeURIComponent(selectedCampaignId)}/sessions`,
        'POST',
        { title: sessionTitle },
      )
      await loadWorkflow(selectedCampaignId)
      setShowSessionForm(false)
    } catch (submissionError) {
      setError(messageFrom(submissionError))
    } finally {
      setBusy(false)
    }
  }

  async function selectSession(gameSession: GameSessionSummary) {
    setBusy(true)
    setError('')
    try {
      const scoped = await sendJson<AuthSessionResponse>('/auth/context', 'POST', {
        campaignId: gameSession.campaignId,
        sessionId: gameSession.id,
      })
      onSelect(scoped)
    } catch (selectionError) {
      setError(messageFrom(selectionError))
    } finally {
      setBusy(false)
    }
  }

  async function reopenSession(gameSession: GameSessionSummary) {
    setBusy(true)
    setError('')
    try {
      await sendJson(
        `/campaigns/${encodeURIComponent(gameSession.campaignId)}/workflow/sessions/${encodeURIComponent(gameSession.id)}/reopen`,
        'POST',
        {},
      )
      await loadWorkflow(gameSession.campaignId)
    } catch (reopenError) {
      setError(messageFrom(reopenError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="lobby-shell">
      <header className="lobby-topbar">
        <div className="lobby-brand">
          <span className="auth-mark" aria-hidden="true">
            <Swords size={22} />
          </span>
          <div>
            <span className="eyebrow">DM Interactive Table</span>
            <h1>Lobby de campañas</h1>
          </div>
        </div>
        <div className="lobby-topbar__actions">
          <button
            type="button"
            className="icon-button"
            title="Actualizar lobby"
            aria-label="Actualizar lobby"
            onClick={() => void loadCampaigns()}
          >
            <RefreshCw size={18} />
          </button>
          <button
            type="button"
            className="icon-button"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            onClick={() => void onLogout()}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <section className="lobby-layout">
        <aside className="campaign-rail" aria-label="Campañas">
          <div className="section-heading">
            <div>
              <span className="section-label">Biblioteca</span>
              <h2>Campañas</h2>
            </div>
            <button
              type="button"
              className="icon-button"
              title="Crear campaña"
              aria-label="Crear campaña"
              onClick={() => setShowCampaignForm((current) => !current)}
            >
              <FolderPlus size={18} />
            </button>
          </div>

          {showCampaignForm ? (
            <form className="compact-create-form" onSubmit={createCampaign}>
              <label>
                Nombre
                <input
                  value={campaignName}
                  onChange={(event) => setCampaignName(event.target.value)}
                  maxLength={120}
                  required
                />
              </label>
              <button type="submit" disabled={busy}>Crear</button>
            </form>
          ) : null}

          <div className="campaign-list">
            {campaigns.map((campaign) => (
              <button
                key={campaign.id}
                type="button"
                className={`campaign-list__item ${
                  campaign.id === selectedCampaignId ? 'is-selected' : ''
                }`}
                onClick={() => setSelectedCampaignId(campaign.id)}
              >
                <span>{campaign.name}</span>
                <small>{campaign.ruleset}</small>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            ))}
          </div>
        </aside>

        <section className="session-directory">
          <header className="session-directory__header">
            <div>
              <span className="section-label">Campaña activa</span>
              <h2>{selectedCampaign?.name ?? 'Selecciona una campaña'}</h2>
              <p>{selectedCampaign?.description || 'Sesiones y mesa de juego'}</p>
            </div>
            {selectedCampaign ? (
              <button
                type="button"
                onClick={() => setShowSessionForm((current) => !current)}
              >
                <CalendarPlus size={17} />
                Nueva sesión
              </button>
            ) : null}
          </header>

          {showSessionForm ? (
            <form className="session-create-form" onSubmit={createSession}>
              <label>
                Título de sesión
                <input
                  value={sessionTitle}
                  onChange={(event) => setSessionTitle(event.target.value)}
                  maxLength={120}
                  required
                />
              </label>
              <button type="submit" disabled={busy}>Crear sesión</button>
            </form>
          ) : null}

          {error ? <p className="auth-error" role="alert">{error}</p> : null}

          <div className="session-list" data-testid="session-list">
            {workflow?.sessions.map((gameSession) => {
              const participants =
                workflow.participantsBySession[gameSession.id] ?? []
              return (
                <article className="session-row" key={gameSession.id}>
                  <div className={`phase-marker phase-marker--${gameSession.phase}`}>
                    <Radio size={16} />
                  </div>
                  <div className="session-row__body">
                    <div className="session-row__title">
                      <h3>{gameSession.title}</h3>
                      <span className={`phase-badge phase-badge--${gameSession.phase}`}>
                        {phaseLabel(gameSession.phase)}
                      </span>
                    </div>
                    <p>
                      {gameSession.startedAt
                        ? `Iniciada ${formatDate(gameSession.startedAt)}`
                        : 'Lista para preparar'}
                    </p>
                    <span className="presence-count">
                      <Users size={15} />
                      {participants.length} conectados
                    </span>
                  </div>
                  <div className="session-row__actions">
                    {gameSession.phase === 'ended' ? (
                      <button
                        type="button"
                        className="secondary-action"
                        disabled={busy}
                        onClick={() => void reopenSession(gameSession)}
                      >
                        Reabrir
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busy || gameSession.phase === 'ended'}
                      onClick={() => void selectSession(gameSession)}
                    >
                      {gameSession.phase === 'live' ? 'Entrar' : 'Preparar'}
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </article>
              )
            })}

            {workflow && workflow.sessions.length === 0 ? (
              <div className="empty-session-state">
                <CalendarPlus size={24} />
                <p>Crea la primera sesión de esta campaña.</p>
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  )
}

function phaseLabel(phase: GameSessionSummary['phase']) {
  if (phase === 'live') return 'En vivo'
  if (phase === 'ended') return 'Finalizada'
  return 'Preparación'
}

function formatDate(value: string) {
  return new Date(value).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : 'No se pudo completar la acción'
}
