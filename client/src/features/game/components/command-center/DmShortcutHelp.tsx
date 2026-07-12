import { X } from 'lucide-react'
import { useEffect } from 'react'

const SHORTCUTS = [
  ['V', 'Seleccionar'],
  ['H', 'Mover mapa'],
  ['F', 'Alternar niebla'],
  ['C', 'Abrir combate'],
  ['N', 'Abrir notas'],
  ['Ctrl/Cmd + Z', 'Deshacer'],
  ['Ctrl/Cmd + Shift + Z', 'Rehacer'],
  ['Ctrl/Cmd + S', 'Crear snapshot'],
  ['Esc', 'Cancelar selección'],
]

export function DmShortcutHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="dm-shortcut-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dm-shortcut-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="dm-kicker">Referencia rápida</span>
            <h2 id="dm-shortcut-title">Atajos de teclado</h2>
          </div>
          <button type="button" aria-label="Cerrar" title="Cerrar" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <dl>
          {SHORTCUTS.map(([shortcut, action]) => (
            <div key={shortcut}>
              <dt><kbd>{shortcut}</kbd></dt>
              <dd>{action}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
