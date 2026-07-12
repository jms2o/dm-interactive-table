import {
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  Images,
  Map,
  Monitor,
  ScrollText,
  Settings,
  Swords,
  Users,
} from 'lucide-react'
import type { ComponentType } from 'react'
import type { DmSection } from '../../types/dm-ui.types'

const ITEMS: Array<{
  id: DmSection
  label: string
  icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }>
}> = [
  { id: 'map', label: 'Mapa', icon: Map },
  { id: 'characters', label: 'Personajes', icon: Users },
  { id: 'npcs', label: 'NPCs', icon: BookOpenText },
  { id: 'combat', label: 'Combate', icon: Swords },
  { id: 'notes', label: 'Notas', icon: ScrollText },
  { id: 'assets', label: 'Assets', icon: Images },
  { id: 'display', label: 'Display', icon: Monitor },
  { id: 'system', label: 'Sistema', icon: Settings },
]

export function DmSideNav({
  activeSection,
  collapsed,
  onSelect,
  onToggle,
}: {
  activeSection: DmSection
  collapsed: boolean
  onSelect: (section: DmSection) => void
  onToggle: () => void
}) {
  return (
    <nav
      className={`dm-side-nav${collapsed ? ' dm-side-nav--collapsed' : ''}`}
      aria-label="Centro de mando"
    >
      <div className="dm-side-nav__items">
        {ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              className={activeSection === item.id ? 'is-active' : ''}
              aria-current={activeSection === item.id ? 'page' : undefined}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
              onClick={() => onSelect(item.id)}
            >
              <Icon size={19} aria-hidden />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>

      <div className="dm-side-nav__footer">
        <p>Que comiencen las leyendas.</p>
        <button
          type="button"
          className="dm-side-nav__collapse"
          aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
          title={collapsed ? 'Expandir menú' : 'Contraer menú'}
          onClick={onToggle}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          <span>Contraer</span>
        </button>
      </div>
    </nav>
  )
}
