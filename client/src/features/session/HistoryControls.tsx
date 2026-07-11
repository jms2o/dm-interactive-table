import { useState, type FormEvent } from 'react'
import { Camera, History, Redo2, RotateCcw, Trash2, Undo2 } from 'lucide-react'
import type { GameHistoryState } from '../../../../shared/types/session-workflow'

export function HistoryControls({
  history,
  undo,
  redo,
  createSnapshot,
  restoreSnapshot,
  deleteSnapshot,
}: {
  history: GameHistoryState
  undo: () => void
  redo: () => void
  createSnapshot: (name: string) => void
  restoreSnapshot: (snapshotId: string) => void
  deleteSnapshot: (snapshotId: string) => void
}) {
  const [name, setName] = useState('Punto seguro')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (name.trim()) createSnapshot(name.trim())
  }

  return (
    <div className="panel-section tool-panel history-panel">
      <div className="history-panel__header">
        <span className="section-label"><History size={15} /> Historial</span>
        <div className="history-actions">
          <button
            type="button"
            className="icon-button"
            title={`Deshacer (${history.undoDepth})`}
            aria-label="Deshacer último cambio"
            disabled={!history.canUndo}
            onClick={undo}
          >
            <Undo2 size={17} />
          </button>
          <button
            type="button"
            className="icon-button"
            title={`Rehacer (${history.redoDepth})`}
            aria-label="Rehacer último cambio"
            disabled={!history.canRedo}
            onClick={redo}
          >
            <Redo2 size={17} />
          </button>
        </div>
      </div>

      <form className="snapshot-create" onSubmit={submit}>
        <input
          aria-label="Nombre del snapshot"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
        />
        <button
          type="submit"
          className="icon-button"
          title="Crear snapshot"
          aria-label="Crear snapshot"
        >
          <Camera size={17} />
        </button>
      </form>

      <div className="snapshot-list">
        {history.snapshots.slice(0, 6).map((snapshot) => (
          <div className="snapshot-row" key={snapshot.id}>
            <div>
              <strong>{snapshot.name}</strong>
              <small>{formatTime(snapshot.createdAt)}</small>
            </div>
            <button
              type="button"
              className="icon-button"
              title="Restaurar snapshot"
              aria-label={`Restaurar ${snapshot.name}`}
              onClick={() => restoreSnapshot(snapshot.id)}
            >
              <RotateCcw size={15} />
            </button>
            <button
              type="button"
              className="icon-button icon-button--danger"
              title="Eliminar snapshot"
              aria-label={`Eliminar ${snapshot.name}`}
              onClick={() => deleteSnapshot(snapshot.id)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {history.snapshots.length === 0 ? (
          <p className="history-empty">Sin snapshots guardados.</p>
        ) : null}
      </div>
    </div>
  )
}

function formatTime(value: string) {
  return new Date(value).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
