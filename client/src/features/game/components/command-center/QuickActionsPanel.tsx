import { Camera, Eye, ScrollText, Swords } from 'lucide-react'

export function QuickActionsPanel({
  canStartCombat,
  onStartCombat,
  onRevealArea,
  onNewNote,
  onSnapshot,
}: {
  canStartCombat: boolean
  onStartCombat: () => void
  onRevealArea: () => void
  onNewNote: () => void
  onSnapshot: () => void
}) {
  return (
    <section className="dm-panel-section" aria-labelledby="quick-actions-title">
      <h3 id="quick-actions-title">Panel rápido</h3>
      <div className="dm-quick-actions">
        <button
          type="button"
          className="is-danger"
          disabled={!canStartCombat}
          title={canStartCombat ? 'Iniciar combate (C)' : 'No hay tokens visibles'}
          onClick={onStartCombat}
        >
          <Swords size={17} /> Iniciar combate
        </button>
        <button type="button" className="is-warning" onClick={onRevealArea}>
          <Eye size={17} /> Revelar área
        </button>
        <button type="button" className="is-note" onClick={onNewNote}>
          <ScrollText size={17} /> Nueva nota
        </button>
        <button type="button" className="is-info" onClick={onSnapshot}>
          <Camera size={17} /> Tomar snapshot
        </button>
      </div>
    </section>
  )
}
