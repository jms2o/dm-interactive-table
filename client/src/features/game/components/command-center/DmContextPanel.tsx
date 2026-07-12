import { PanelRightClose, X } from 'lucide-react'
import type { ReactNode } from 'react'
import type { DmSection } from '../../types/dm-ui.types'

const TITLES: Record<DmSection, string> = {
  map: 'Inspector del mapa',
  characters: 'Personajes',
  npcs: 'NPCs y criaturas',
  combat: 'Control de combate',
  notes: 'Notas y narrativa',
  assets: 'Biblioteca de assets',
  display: 'Display de mesa',
  system: 'Sistema',
}

export function DmContextPanel({
  enabled,
  activeSection,
  onClose,
  children,
}: {
  enabled: boolean
  activeSection: DmSection
  onClose: () => void
  children: ReactNode
}) {
  if (!enabled) return <aside className="control-panel">{children}</aside>

  return (
    <aside className="control-panel dm-context-panel" aria-label={TITLES[activeSection]}>
      <header className="dm-context-panel__header">
        <div>
          <span className="dm-kicker">Panel contextual</span>
          <h2>{TITLES[activeSection]}</h2>
        </div>
        <button
          type="button"
          className="dm-icon-button dm-context-panel__close"
          aria-label="Cerrar panel contextual"
          title="Cerrar panel"
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <PanelRightClose size={17} className="dm-context-panel__desktop-icon" aria-hidden />
      </header>
      <div className="dm-context-panel__body">{children}</div>
    </aside>
  )
}

export function DmAdvancedTools({
  enabled,
  children,
}: {
  enabled: boolean
  children: ReactNode
}) {
  if (!enabled) return <>{children}</>

  return (
    <details className="dm-advanced-tools">
      <summary>Herramientas avanzadas</summary>
      <div className="dm-advanced-tools__content">{children}</div>
    </details>
  )
}
