import { CheckCircle2, ListTree } from 'lucide-react'

export function DmSystemStatusBar({
  savedAt,
  lastEvent,
  userName,
  version,
}: {
  savedAt?: string
  lastEvent: string
  userName: string
  version: string
}) {
  return (
    <footer className="dm-system-status-bar">
      <span className="is-success">
        <CheckCircle2 size={14} aria-hidden="true" />
        Guardado automático: {savedAt ? relativeTime(savedAt) : 'pendiente'}
      </span>
      <span className="dm-system-status-bar__event">
        Última acción: {humanizeEvent(lastEvent)}
      </span>
      <span>{userName}</span>
      <span>Versión {version}</span>
      <a
        href="https://github.com/jms2o/dm-interactive-table/releases"
        target="_blank"
        rel="noreferrer"
        title="Cambios recientes"
        aria-label="Cambios recientes"
      >
        <ListTree size={15} />
        <span>Ver cambios</span>
      </a>
    </footer>
  )
}

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 10) return 'ahora'
  if (seconds < 60) return `hace ${seconds}s`
  return `hace ${Math.floor(seconds / 60)} min`
}

function humanizeEvent(value: string) {
  if (!value) return 'Sin actividad reciente'
  return value
    .replaceAll(':', ' · ')
    .replaceAll('token moved', 'Movimiento de token')
    .replaceAll('history updated', 'Historial actualizado')
}
