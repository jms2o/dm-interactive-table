import { Camera, Plus, Redo2, RotateCcw, Trash2, Undo2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { GameHistoryState } from '../../../../../../shared/types/session-workflow'

export function DmTimelineBar({
  history,
  mapImageUrl,
  undo,
  redo,
  createSnapshot,
  restoreSnapshot,
  deleteSnapshot,
}: {
  history: GameHistoryState
  mapImageUrl?: string
  undo: () => void
  redo: () => void
  createSnapshot: (name: string) => void
  restoreSnapshot: (snapshotId: string) => void
  deleteSnapshot: (snapshotId: string) => void
}) {
  const [name, setName] = useState('Nuevo punto de control')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (name.trim()) createSnapshot(name.trim())
  }

  return (
    <section className="dm-timeline" aria-label="Línea de tiempo y snapshots">
      <header className="dm-timeline__heading">
        <div>
          <span className="dm-kicker">Línea de tiempo</span>
          <strong>Snapshots</strong>
        </div>
        <form onSubmit={submit}>
          <input
            aria-label="Nombre del snapshot"
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
          />
          <button type="submit" aria-label="Crear snapshot" title="Crear snapshot (Ctrl+S)">
            <Plus size={17} />
          </button>
        </form>
      </header>

      <div className="dm-timeline__track">
        {history.snapshots.slice(0, 12).map((snapshot) => (
          <article className="dm-snapshot" key={snapshot.id}>
            <div
              className="dm-snapshot__preview"
              style={mapImageUrl ? { backgroundImage: `url(${mapImageUrl})` } : undefined}
            >
              <Camera size={16} aria-hidden="true" />
            </div>
            <div className="dm-snapshot__body">
              <strong title={snapshot.name}>{snapshot.name}</strong>
              <time dateTime={snapshot.createdAt}>{formatTime(snapshot.createdAt)}</time>
            </div>
            <div className="dm-snapshot__actions">
              <button
                type="button"
                aria-label={`Restaurar ${snapshot.name}`}
                title="Restaurar snapshot"
                onClick={() => {
                  if (window.confirm(`¿Restaurar el snapshot “${snapshot.name}”?`)) {
                    restoreSnapshot(snapshot.id)
                  }
                }}
              >
                <RotateCcw size={14} />
              </button>
              <button
                type="button"
                aria-label={`Eliminar ${snapshot.name}`}
                title="Eliminar snapshot"
                onClick={() => {
                  if (window.confirm(`¿Eliminar el snapshot “${snapshot.name}”?`)) {
                    deleteSnapshot(snapshot.id)
                  }
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </article>
        ))}
        {history.snapshots.length === 0 ? (
          <div className="dm-timeline__empty">
            <Camera size={18} />
            <span>Sin snapshots todavía</span>
          </div>
        ) : null}
      </div>

      <div className="dm-history-actions">
        <button
          type="button"
          disabled={!history.canUndo}
          aria-label="Deshacer"
          title={`Deshacer (${history.undoDepth})`}
          onClick={undo}
        >
          <Undo2 size={19} />
          <span>Deshacer</span>
        </button>
        <button
          type="button"
          disabled={!history.canRedo}
          aria-label="Rehacer"
          title={`Rehacer (${history.redoDepth})`}
          onClick={redo}
        >
          <Redo2 size={19} />
          <span>Rehacer</span>
        </button>
      </div>
    </section>
  )
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}
