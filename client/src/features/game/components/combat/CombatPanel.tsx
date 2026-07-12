import { Pause, Play, Plus, SkipForward, Square, Swords } from 'lucide-react'
import type { EncounterState } from '../../../../../../shared/types/combat'
import type { GameToken } from '../../../../../../shared/types/token'

export function CombatPanel({
  encounter,
  tokens,
  onStart,
  onAdvance,
}: {
  encounter: EncounterState | null
  tokens: GameToken[]
  onStart: () => void
  onAdvance: () => void
}) {
  const active = encounter?.combatants.find((combatant) => combatant.id === encounter.activeCombatantId)

  return (
    <section className="dm-combat-panel" aria-labelledby="combat-panel-title">
      <header>
        <div><span className="dm-kicker">Encuentro</span><h3 id="combat-panel-title">{encounter?.name ?? 'Sin combate activo'}</h3></div>
        <span className={encounter ? 'is-danger' : 'is-muted'}><Swords size={15} /> {encounter ? `Ronda ${encounter.roundNumber}` : 'En espera'}</span>
      </header>

      {encounter ? (
        <>
          <div className="dm-current-turn"><span>Turno actual</span><strong>{active?.name ?? 'Sin participante'}</strong></div>
          <ol className="dm-initiative-list">
            {encounter.combatants.map((combatant) => (
              <li key={combatant.id} className={combatant.id === encounter.activeCombatantId ? 'is-active' : ''}>
                <span>{combatant.turnOrder + 1}</span>
                <div><strong>{combatant.name}</strong><small>{combatant.conditions.join(', ') || 'Sin condiciones'}</small></div>
                <code>{combatant.initiative}</code>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <div className="dm-empty-state dm-empty-state--compact"><Swords size={21} /><p>{tokens.length ? `${tokens.length} tokens listos para iniciativa.` : 'Añade tokens visibles antes de iniciar.'}</p></div>
      )}

      <div className="dm-combat-actions">
        <button type="button" disabled={Boolean(encounter) || tokens.length === 0} onClick={onStart}><Play size={16} /> Iniciar</button>
        <button type="button" disabled={!encounter} onClick={onAdvance}><SkipForward size={16} /> Siguiente</button>
        <button type="button" disabled title="Turno anterior todavía no disponible"><SkipForward size={16} className="is-reversed" /></button>
        <button type="button" disabled title="Pausar todavía no disponible"><Pause size={16} /></button>
        <button type="button" disabled title="Agregar participante todavía no disponible"><Plus size={16} /></button>
        <button type="button" disabled title="Finalizar combate todavía no disponible"><Square size={16} /></button>
      </div>
    </section>
  )
}
