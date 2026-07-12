import { Activity, Expand, Gauge, Monitor, Moon, RefreshCw, Ruler, Tablet, Tv } from 'lucide-react'
import type { TableDeviceExperience } from '../../../device/useTableDeviceExperience'

export function DisplayPanel({
  connected,
  socketLatencyMs,
  device,
}: {
  connected: boolean
  socketLatencyMs: number | null
  device: TableDeviceExperience
}) {
  return (
    <section className="dm-display-panel" aria-labelledby="display-panel-title">
      <header><div><span className="dm-kicker">Mesa física</span><h3 id="display-panel-title">Display</h3></div><span className={connected ? 'is-success' : 'is-warning'}><Monitor size={15} /> {connected ? 'Conectado' : 'Sin conectar'}</span></header>
      <dl className="dm-metric-grid">
        <div><dt><Activity size={14} /> Latencia</dt><dd>{socketLatencyMs === null ? '—' : `${socketLatencyMs} ms`}</dd></div>
        <div><dt><Gauge size={14} /> FPS</dt><dd>{device.fps || '—'}</dd></div>
        <div><dt><Expand size={14} /> Resolución</dt><dd>{device.viewport.width} × {device.viewport.height}</dd></div>
        <div><dt><Ruler size={14} /> Perfil</dt><dd>{profileLabel(device.preferences.profile)}</dd></div>
      </dl>
      <div className="dm-profile-segment" role="group" aria-label="Perfil de display">
        <button type="button" className={device.preferences.profile === 'tv' ? 'is-active' : ''} onClick={() => device.setProfile('tv')}><Tv size={17} /> TV</button>
        <button type="button" className={device.preferences.profile === 'tablet' ? 'is-active' : ''} onClick={() => device.setProfile('tablet')}><Tablet size={17} /> Tableta</button>
        <button type="button" className={device.preferences.profile === 'phone' ? 'is-active' : ''} onClick={() => device.setProfile('phone')}><Monitor size={17} /> Teléfono</button>
      </div>
      <div className="dm-display-actions">
        <button type="button" onClick={() => void device.measureHttpLatency()}><RefreshCw size={16} /> Sincronizar</button>
        <button type="button" onClick={() => void device.toggleFullscreen()}><Expand size={16} /> Fullscreen</button>
        <button type="button" onClick={() => device.updatePreferences({ calibrationEnabled: !device.preferences.calibrationEnabled })}><Ruler size={16} /> Calibrar</button>
        <button type="button" onClick={() => device.updatePreferences({ wakeLockEnabled: !device.preferences.wakeLockEnabled })}><Moon size={16} /> Wake Lock</button>
      </div>
    </section>
  )
}

function profileLabel(profile: TableDeviceExperience['preferences']['profile']) {
  if (profile === 'tv') return 'TV'
  if (profile === 'tablet') return 'Tableta'
  return 'Teléfono'
}
