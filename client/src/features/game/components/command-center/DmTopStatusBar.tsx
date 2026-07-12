import {
  Activity,
  Castle,
  CircleUserRound,
  Monitor,
  Radio,
  Users,
  WifiOff,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { SessionPhase } from '../../../../../../shared/types/session-workflow'

export function DmTopStatusBar({
  campaignName,
  sessionTitle,
  sessionId,
  phase,
  playerCount,
  displayConnected,
  connected,
  latencyMs,
  fps,
  lifecycleControl,
  viewNavigation,
  commands,
}: {
  campaignName: string
  sessionTitle: string
  sessionId?: string
  phase?: SessionPhase
  playerCount: number
  displayConnected: boolean
  connected: boolean
  latencyMs: number | null
  fps: number
  lifecycleControl: ReactNode
  viewNavigation: ReactNode
  commands: ReactNode
}) {
  return (
    <header className="dm-top-status-bar">
      <div className="dm-brand" aria-label="DM Command Center">
        <span className="dm-brand__mark" aria-hidden="true">
          <Castle size={25} />
        </span>
        <div>
          <span>DM</span>
          <strong>Command Center</strong>
        </div>
      </div>

      <StatusItem label="Campaña" className="dm-top-campaign">
        <strong title={campaignName}>{campaignName}</strong>
        <span>{sessionTitle}</span>
      </StatusItem>

      <StatusItem label="Sesión">
        <span className={`dm-live-state dm-live-state--${phase ?? 'preparation'}`}>
          <Radio size={11} aria-hidden="true" />
          {phaseLabel(phase)}
        </span>
      </StatusItem>

      <StatusItem label="ID de sesión">
        <strong className="dm-session-code">{shortSessionId(sessionId)}</strong>
      </StatusItem>

      <StatusItem label="Jugadores">
        <span className="dm-status-value">
          <Users size={15} aria-hidden="true" />
          {playerCount} conectados
        </span>
      </StatusItem>

      <StatusItem label="Display">
        <span className={displayConnected ? 'is-success' : 'is-warning'}>
          <Monitor size={14} aria-hidden="true" />
          {displayConnected ? 'Conectado' : 'Sin conectar'}
        </span>
      </StatusItem>

      <StatusItem label="Latencia">
        <span className={latencyTone(latencyMs)}>
          {connected ? <Activity size={14} aria-hidden="true" /> : <WifiOff size={14} />}
          {latencyMs === null ? '—' : `${latencyMs} ms`}
        </span>
      </StatusItem>

      <StatusItem label="FPS">
        <strong className={fps >= 45 ? 'is-success' : fps ? 'is-warning' : ''}>
          {fps || '—'}
        </strong>
      </StatusItem>

      <div className="dm-top-status-bar__actions">
        {viewNavigation}
        {commands}
        {lifecycleControl}
        <CircleUserRound size={18} className="dm-user-indicator" aria-hidden="true" />
      </div>
    </header>
  )
}

function StatusItem({
  label,
  className = '',
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`dm-top-status ${className}`}>
      <span className="dm-top-status__label">{label}</span>
      <div className="dm-top-status__value">{children}</div>
    </div>
  )
}

function phaseLabel(phase: SessionPhase | undefined) {
  if (phase === 'live') return 'En vivo'
  if (phase === 'ended') return 'Finalizada'
  return 'Preparación'
}

function shortSessionId(sessionId: string | undefined) {
  if (!sessionId) return '—'
  return sessionId.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase()
}

function latencyTone(latencyMs: number | null) {
  if (latencyMs === null) return 'is-danger'
  if (latencyMs > 180) return 'is-danger'
  if (latencyMs > 90) return 'is-warning'
  return 'is-success'
}
