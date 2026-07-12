import { Activity, Database, HardDrive, RefreshCw, Server, ShieldCheck, Wifi } from 'lucide-react'
import type { DemoReadinessResponse } from '../../../../../../shared/types/demo'
import type { TableAccessStatus } from '../../../../../../shared/types/auth'
import type { TableDeviceExperience } from '../../../device/useTableDeviceExperience'

export function SystemPanel({
  connected,
  lastError,
  lastEvent,
  tableAccess,
  readiness,
  device,
  version,
  onRefresh,
}: {
  connected: boolean
  lastError: string
  lastEvent: string
  tableAccess: TableAccessStatus | null
  readiness: DemoReadinessResponse | null
  device: TableDeviceExperience
  version: string
  onRefresh: () => void
}) {
  return (
    <section className="dm-system-panel" aria-labelledby="system-panel-title">
      <header><div><span className="dm-kicker">Diagnóstico</span><h3 id="system-panel-title">Sistema</h3></div><button type="button" title="Actualizar estado" aria-label="Actualizar estado" onClick={onRefresh}><RefreshCw size={16} /></button></header>
      <dl className="dm-system-list">
        <div><dt><Server size={15} /> Servidor</dt><dd className={device.online ? 'is-success' : 'is-danger'}>{device.online ? 'Disponible' : 'Sin red'}</dd></div>
        <div><dt><Wifi size={15} /> Socket.IO</dt><dd className={connected ? 'is-success' : 'is-danger'}>{connected ? 'Conectado' : 'Desconectado'}</dd></div>
        <div><dt><Activity size={15} /> HTTP</dt><dd>{device.httpLatencyMs === null ? '—' : `${device.httpLatencyMs} ms`}</dd></div>
        <div><dt><ShieldCheck size={15} /> Acceso de mesa</dt><dd className={tableAccess?.active ? 'is-success' : 'is-warning'}>{tableAccess?.active ? 'Activo' : 'Cerrado'}</dd></div>
        <div><dt><Database size={15} /> Release</dt><dd>{readiness ? `${readiness.readyCount}/${readiness.totalCount}` : '—'}</dd></div>
        <div><dt><HardDrive size={15} /> Versión</dt><dd>{version}</dd></div>
      </dl>
      <div className="dm-system-event"><span>Último evento</span><code>{lastEvent || 'Sin actividad'}</code></div>
      {lastError ? <p className="dm-system-error" role="alert">{lastError}</p> : null}
    </section>
  )
}
