import {
  Crosshair,
  Edit3,
  Eye,
  EyeOff,
  Shield,
  Trash2,
  X,
} from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import type { CombatantState } from '../../../../../../shared/types/combat'
import type { GameToken } from '../../../../../../shared/types/token'

type InspectorTab = 'state' | 'details' | 'notes'

export function TokenInspector({
  token,
  combatant,
  onCenter,
  onClear,
}: {
  token: GameToken | null
  combatant?: CombatantState
  onCenter: () => void
  onClear: () => void
}) {
  const [tab, setTab] = useState<InspectorTab>('state')

  if (!token) {
    return (
      <section className="dm-token-inspector dm-empty-state">
        <Crosshair size={24} aria-hidden="true" />
        <h3>Ningún token seleccionado</h3>
        <p>Selecciona un personaje o criatura en el mapa para ver sus detalles.</p>
      </section>
    )
  }

  return (
    <section className="dm-token-inspector" aria-labelledby="token-inspector-title">
      <header className="dm-token-inspector__hero">
        <span className="dm-token-avatar" style={{ '--token-color': token.color } as CSSProperties}>
          {initials(token.name)}
        </span>
        <div>
          <span className="dm-kicker">Token seleccionado</span>
          <h3 id="token-inspector-title">{token.name}</h3>
          <p>{typeLabel(token.type)}</p>
        </div>
        <button type="button" aria-label="Limpiar selección" title="Limpiar selección" onClick={onClear}>
          <X size={16} />
        </button>
      </header>

      {combatant?.currentHp !== undefined ? (
        <div className="dm-token-health">
          <span>HP</span>
          <strong>{combatant.currentHp}</strong>
        </div>
      ) : null}

      <div className="dm-tabs" role="tablist" aria-label="Detalles del token">
        {(['state', 'details', 'notes'] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            className={tab === item ? 'is-active' : ''}
            onClick={() => setTab(item)}
          >
            {tabLabel(item)}
          </button>
        ))}
      </div>

      {tab === 'state' ? (
        <div className="dm-token-state">
          <dl>
            <div><dt>Visibilidad</dt><dd>{token.visible ? 'Pública' : 'Solo DM'}</dd></div>
            {combatant ? <div><dt>Iniciativa</dt><dd>{combatant.initiative}</dd></div> : null}
            {combatant?.temporaryHp ? <div><dt>HP temporal</dt><dd>{combatant.temporaryHp}</dd></div> : null}
          </dl>
          <div className="dm-condition-list" aria-label="Condiciones activas">
            {combatant?.conditions.length ? (
              combatant.conditions.map((condition) => <span key={condition}>{condition}</span>)
            ) : (
              <span className="is-muted">Sin condiciones registradas</span>
            )}
          </div>
        </div>
      ) : null}

      {tab === 'details' ? (
        <dl className="dm-token-details">
          <div><dt>Tipo</dt><dd>{typeLabel(token.type)}</dd></div>
          <div><dt>Posición</dt><dd>{Math.round(token.x)}, {Math.round(token.y)}</dd></div>
          <div><dt>Tamaño</dt><dd>{token.size} casilla</dd></div>
          <div><dt>Asset</dt><dd>{token.imageAssetId ?? 'Sin retrato asociado'}</dd></div>
        </dl>
      ) : null}

      {tab === 'notes' ? (
        <div className="dm-empty-inline">Este token no tiene notas públicas asociadas.</div>
      ) : null}

      <div className="dm-token-actions" aria-label="Acciones del token">
        <DisabledAction icon={<EyeOff size={17} />} label="Ocultar" />
        <DisabledAction icon={<Eye size={17} />} label="Revelar" />
        <button type="button" onClick={onCenter} title="Centrar en el mapa">
          <Crosshair size={17} /><span>Centrar</span>
        </button>
        <DisabledAction icon={<Edit3 size={17} />} label="Editar" />
        <DisabledAction icon={<Trash2 size={17} />} label="Eliminar" danger />
      </div>

      {combatant ? (
        <span className="dm-combat-chip"><Shield size={13} /> En combate</span>
      ) : null}
    </section>
  )
}

function DisabledAction({ icon, label, danger = false }: { icon: ReactNode; label: string; danger?: boolean }) {
  return (
    <button
      type="button"
      className={danger ? 'is-danger' : ''}
      disabled
      title={`${label}: esta función todavía no está disponible`}
    >
      {icon}<span>{label}</span>
    </button>
  )
}

function initials(value: string) {
  return value.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function typeLabel(type: GameToken['type']) {
  if (type === 'player') return 'Personaje jugador'
  if (type === 'enemy') return 'Enemigo'
  if (type === 'npc') return 'NPC'
  return 'Objeto'
}

function tabLabel(tab: InspectorTab) {
  if (tab === 'state') return 'Estado'
  if (tab === 'details') return 'Detalles'
  return 'Notas'
}
