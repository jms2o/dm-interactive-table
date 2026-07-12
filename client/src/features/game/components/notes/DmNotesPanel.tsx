import { Eye, LockKeyhole, Pin, Plus, Search, Send } from 'lucide-react'

export function DmNotesPanel({
  narrative,
  onNarrativeChange,
  onPublish,
}: {
  narrative: string
  onNarrativeChange: (value: string) => void
  onPublish: () => void
}) {
  return (
    <section className="dm-notes-panel" aria-labelledby="notes-panel-title">
      <header><div><span className="dm-kicker">Diario del DM</span><h3 id="notes-panel-title">Notas</h3></div><button type="button" disabled title="Las notas privadas todavía no tienen API"><Plus size={16} /></button></header>
      <label className="dm-search-field"><Search size={16} /><input disabled placeholder="Buscar notas (próximamente)" /></label>
      <div className="dm-note-categories" role="group" aria-label="Categorías">
        <button type="button" className="is-active">Narrativa</button>
        <button type="button" disabled>Pistas</button>
        <button type="button" disabled>Secretos</button>
        <button type="button" disabled>Misiones</button>
      </div>
      <div className="dm-note-editor">
        <div><Eye size={15} /><strong>Narrativa pública</strong><span>Visible para la mesa</span></div>
        <textarea value={narrative} rows={8} onChange={(event) => onNarrativeChange(event.target.value)} />
        <button type="button" onClick={onPublish}><Send size={16} /> Publicar narrativa</button>
      </div>
      <div className="dm-private-note-disabled" title="Esta función todavía no está disponible">
        <LockKeyhole size={16} /><span>Notas privadas</span><Pin size={14} />
      </div>
    </section>
  )
}
