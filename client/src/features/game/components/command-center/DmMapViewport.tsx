import {
  Eye,
  Focus,
  Hand,
  HelpCircle,
  Layers3,
  MapPin,
  Maximize2,
  MousePointer2,
  PenTool,
  Ruler,
  Type,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { DmMapTool } from '../../types/dm-ui.types'

export function DmMapViewport({
  activeTool,
  fogEnabled,
  onToolChange,
  onToggleFog,
  onCenterSelection,
  onFullscreen,
  onShowHelp,
  children,
}: {
  activeTool: DmMapTool
  fogEnabled: boolean
  onToolChange: (tool: DmMapTool) => void
  onToggleFog: () => void
  onCenterSelection: () => void
  onFullscreen: () => void | Promise<void>
  onShowHelp: () => void
  children: ReactNode
}) {
  return (
    <section className="dm-map-viewport" aria-label="Mapa interactivo">
      <div className="dm-map-toolbar" role="toolbar" aria-label="Herramientas del mapa">
        <ToolButton
          label="Seleccionar (V)"
          active={activeTool === 'select'}
          onClick={() => onToolChange('select')}
          icon={<MousePointer2 size={17} />}
        />
        <ToolButton
          label="Mover mapa (H)"
          active={activeTool === 'pan'}
          onClick={() => onToolChange('pan')}
          icon={<Hand size={17} />}
        />
        <ToolButton
          label="Colocar marcador — todavía no disponible"
          disabled
          onClick={() => undefined}
          icon={<MapPin size={17} />}
        />
        <ToolButton
          label="Dibujar muro"
          active={activeTool === 'draw'}
          onClick={() => onToolChange('draw')}
          icon={<PenTool size={17} />}
        />
        <ToolButton
          label="Añadir texto — todavía no disponible"
          disabled
          onClick={() => undefined}
          icon={<Type size={17} />}
        />
        <ToolButton
          label="Capas"
          active={activeTool === 'layers'}
          onClick={() => onToolChange('layers')}
          icon={<Layers3 size={17} />}
        />
        <ToolButton
          label="Medición — todavía no disponible"
          disabled
          onClick={() => undefined}
          icon={<Ruler size={17} />}
        />
        <span className="dm-map-toolbar__separator" aria-hidden="true" />
        <ToolButton
          label={fogEnabled ? 'Ocultar niebla (F)' : 'Activar niebla (F)'}
          active={fogEnabled}
          onClick={onToggleFog}
          icon={<Eye size={17} />}
        />
        <ToolButton
          label="Centrar token seleccionado"
          onClick={onCenterSelection}
          icon={<Focus size={17} />}
        />
        <ToolButton
          label="Pantalla completa"
          onClick={() => void onFullscreen()}
          icon={<Maximize2 size={17} />}
        />
        <ToolButton
          label="Atajos de teclado"
          onClick={onShowHelp}
          icon={<HelpCircle size={17} />}
        />
      </div>
      <div className="dm-map-viewport__canvas">{children}</div>
    </section>
  )
}

function ToolButton({
  label,
  icon,
  active = false,
  disabled = false,
  onClick,
}: {
  label: string
  icon: ReactNode
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={active ? 'is-active' : ''}
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
    </button>
  )
}
