import { useState } from 'react'
import {
  Activity,
  Gauge,
  Maximize2,
  Minimize2,
  MonitorCog,
  RefreshCw,
  Ruler,
  Smartphone,
  Tablet,
  Tv,
  Wifi,
  X,
} from 'lucide-react'
import type {
  PhysicalUnit,
  TableDeviceProfile,
} from '../../../../shared/types/device-experience'
import { convertCellUnit, physicalCellInches } from './table-device'
import type { TableDeviceExperience } from './useTableDeviceExperience'

export function TableDeviceControl({
  device,
  socketLatencyMs,
  socketRecovered,
}: {
  device: TableDeviceExperience
  socketLatencyMs: number | null
  socketRecovered: boolean
}) {
  const [open, setOpen] = useState(false)
  const preferences = device.preferences
  const calibrationPixels =
    physicalCellInches(preferences) * preferences.pixelsPerInch

  function setUnit(unit: PhysicalUnit) {
    device.updatePreferences({
      physicalUnit: unit,
      cellSize: Number(
        convertCellUnit(
          preferences.cellSize,
          preferences.physicalUnit,
          unit,
        ).toFixed(2),
      ),
    })
  }

  return (
    <>
      <button
        type="button"
        className="icon-button"
        title="Dispositivo"
        aria-label="Dispositivo"
        onClick={() => setOpen(true)}
      >
        <MonitorCog size={18} />
      </button>

      {open ? (
        <div className="modal-backdrop" role="presentation">
          <section
            className="device-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="device-modal-title"
          >
            <header>
              <div>
                <span className="eyebrow">Mesa fisica</span>
                <h2 id="device-modal-title">Dispositivo</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                title="Cerrar"
                aria-label="Cerrar"
                onClick={() => setOpen(false)}
              >
                <X size={19} />
              </button>
            </header>

            <div className="device-modal__body">
              <section className="device-section" aria-labelledby="device-profile-label">
                <div className="device-section__heading">
                  <MonitorCog size={17} />
                  <strong id="device-profile-label">Perfil</strong>
                </div>
                <div className="profile-segment" role="group" aria-label="Perfil de dispositivo">
                  <ProfileButton
                    profile="tv"
                    active={preferences.profile === 'tv'}
                    icon={<Tv size={17} />}
                    label="TV"
                    onSelect={device.setProfile}
                  />
                  <ProfileButton
                    profile="tablet"
                    active={preferences.profile === 'tablet'}
                    icon={<Tablet size={17} />}
                    label="Tableta"
                    onSelect={device.setProfile}
                  />
                  <ProfileButton
                    profile="phone"
                    active={preferences.profile === 'phone'}
                    icon={<Smartphone size={17} />}
                    label="Telefono"
                    onSelect={device.setProfile}
                  />
                </div>
              </section>

              <section className="device-section" aria-labelledby="calibration-label">
                <div className="device-section__heading">
                  <Ruler size={17} />
                  <strong id="calibration-label">Calibracion</strong>
                  <label className="switch-control">
                    <input
                      type="checkbox"
                      aria-label="Calibracion fisica"
                      checked={preferences.calibrationEnabled}
                      onChange={(event) =>
                        device.updatePreferences({
                          calibrationEnabled: event.target.checked,
                        })
                      }
                    />
                    <span aria-hidden="true" />
                  </label>
                </div>
                <div className="calibration-controls">
                  <div className="unit-segment" role="group" aria-label="Unidad fisica">
                    <button
                      type="button"
                      className={preferences.physicalUnit === 'cm' ? 'is-active' : ''}
                      onClick={() => setUnit('cm')}
                    >
                      cm
                    </button>
                    <button
                      type="button"
                      className={preferences.physicalUnit === 'in' ? 'is-active' : ''}
                      onClick={() => setUnit('in')}
                    >
                      in
                    </button>
                  </div>
                  <label>
                    Casilla
                    <input
                      type="number"
                      min={preferences.physicalUnit === 'cm' ? 0.5 : 0.25}
                      max={preferences.physicalUnit === 'cm' ? 10 : 4}
                      step={preferences.physicalUnit === 'cm' ? 0.1 : 0.05}
                      value={preferences.cellSize}
                      onChange={(event) =>
                        device.updatePreferences({
                          cellSize: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="calibration-density">
                    Escala <output>{preferences.pixelsPerInch} ppp</output>
                    <input
                      type="range"
                      min="48"
                      max="240"
                      step="1"
                      value={preferences.pixelsPerInch}
                      onChange={(event) =>
                        device.updatePreferences({
                          pixelsPerInch: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                </div>
                <div className="calibration-preview" aria-label="Muestra de casilla calibrada">
                  <span
                    style={{
                      width: `${calibrationPixels}px`,
                      height: `${calibrationPixels}px`,
                    }}
                  >
                    {preferences.cellSize} {preferences.physicalUnit}
                  </span>
                </div>
              </section>

              <section className="device-section" aria-labelledby="presentation-label">
                <div className="device-section__heading">
                  <Gauge size={17} />
                  <strong id="presentation-label">Presentacion</strong>
                </div>
                <label className="range-control">
                  Safe area <output>{preferences.safeAreaPx}px</output>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="2"
                    value={preferences.safeAreaPx}
                    onChange={(event) =>
                      device.updatePreferences({
                        safeAreaPx: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <div className="toggle-list">
                  <Toggle
                    label="Wake Lock"
                    checked={preferences.wakeLockEnabled}
                    disabled={!device.wakeLockSupported}
                    onChange={(checked) =>
                      device.updatePreferences({ wakeLockEnabled: checked })
                    }
                  />
                  <Toggle
                    label="Kiosk"
                    checked={preferences.kioskEnabled}
                    onChange={(checked) =>
                      device.updatePreferences({ kioskEnabled: checked })
                    }
                  />
                  <Toggle
                    label="Ocultar cursor"
                    checked={preferences.hideCursor}
                    onChange={(checked) =>
                      device.updatePreferences({ hideCursor: checked })
                    }
                  />
                </div>
                <button
                  type="button"
                  className="fullscreen-command"
                  onClick={() => void device.toggleFullscreen()}
                >
                  {device.isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                  {device.isFullscreen ? 'Salir de fullscreen' : 'Fullscreen'}
                </button>
              </section>

              <section className="device-section diagnostics-section" aria-labelledby="diagnostics-label">
                <div className="device-section__heading">
                  <Activity size={17} />
                  <strong id="diagnostics-label">Diagnostico</strong>
                  <button
                    type="button"
                    className="icon-button"
                    title="Actualizar diagnostico"
                    aria-label="Actualizar diagnostico"
                    onClick={() => void device.measureHttpLatency()}
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
                <dl className="diagnostic-grid">
                  <Diagnostic label="Socket" value={formatLatency(socketLatencyMs)} />
                  <Diagnostic label="HTTP" value={formatLatency(device.httpLatencyMs)} />
                  <Diagnostic label="Render" value={`${device.fps} FPS`} />
                  <Diagnostic
                    label="Viewport"
                    value={`${device.viewport.width} x ${device.viewport.height}`}
                  />
                  <Diagnostic label="DPR" value={device.viewport.dpr.toFixed(2)} />
                  <Diagnostic
                    label="Wake Lock"
                    value={
                      !device.wakeLockSupported
                        ? 'No disponible'
                        : device.wakeLockActive
                          ? 'Activo'
                          : 'En espera'
                    }
                  />
                  <Diagnostic
                    label="Red"
                    value={device.online ? 'Online' : 'Offline'}
                    icon={<Wifi size={14} />}
                  />
                  <Diagnostic
                    label="Recuperacion"
                    value={socketRecovered ? 'Recuperada' : 'Normal'}
                  />
                </dl>
              </section>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}

function ProfileButton({
  profile,
  active,
  icon,
  label,
  onSelect,
}: {
  profile: TableDeviceProfile
  active: boolean
  icon: React.ReactNode
  label: string
  onSelect: (profile: TableDeviceProfile) => void
}) {
  return (
    <button
      type="button"
      className={active ? 'is-active' : ''}
      aria-pressed={active}
      onClick={() => onSelect(profile)}
    >
      {icon}
      {label}
    </button>
  )
}

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label>
      <span>{label}</span>
      <span className="switch-control">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span aria-hidden="true" />
      </span>
    </label>
  )
}

function Diagnostic({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: React.ReactNode
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {icon}
        {value}
      </dd>
    </div>
  )
}

function formatLatency(value: number | null) {
  return value === null ? 'Sin muestra' : `${value} ms`
}
