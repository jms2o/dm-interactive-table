import { Crosshair, Eye, EyeOff, Plus, Search, Skull, UserRoundCog } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { GameToken } from '../../../../../../shared/types/token'

export function NpcPanel({
  tokens,
  npcName,
  npcRole,
  enemyName,
  enemyHp,
  status,
  onNpcNameChange,
  onNpcRoleChange,
  onEnemyNameChange,
  onEnemyHpChange,
  onCreateNpc,
  onCreateEnemy,
  onSelect,
  onCenter,
}: {
  tokens: GameToken[]
  npcName: string
  npcRole: string
  enemyName: string
  enemyHp: string
  status: string
  onNpcNameChange: (value: string) => void
  onNpcRoleChange: (value: string) => void
  onEnemyNameChange: (value: string) => void
  onEnemyHpChange: (value: string) => void
  onCreateNpc: () => void
  onCreateEnemy: () => void
  onSelect: (tokenId: string) => void
  onCenter: (tokenId: string) => void
}) {
  const [query, setQuery] = useState('')
  const visibleTokens = useMemo(
    () => tokens.filter((token) => token.name.toLowerCase().includes(query.trim().toLowerCase())),
    [query, tokens],
  )

  return (
    <section className="dm-list-panel" aria-labelledby="npc-panel-title">
      <header>
        <div><span className="dm-kicker">Directorio</span><h3 id="npc-panel-title">NPCs y enemigos</h3></div>
        <span>{tokens.length}</span>
      </header>
      <label className="dm-search-field">
        <Search size={16} aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar criatura" />
      </label>
      <div className="dm-entity-list">
        {visibleTokens.map((token) => (
          <article key={token.id} className="dm-entity-row">
            <button type="button" className="dm-entity-row__select" onClick={() => onSelect(token.id)}>
              <span className="dm-entity-avatar" style={{ background: token.color }}>
                {token.type === 'enemy' ? <Skull size={17} /> : <UserRoundCog size={17} />}
              </span>
              <span className="dm-entity-row__body"><strong>{token.name}</strong><small>{token.type === 'enemy' ? 'Enemigo' : 'NPC'} · {token.visible ? 'visible' : 'oculto'}</small></span>
              {token.visible ? <Eye size={15} className="is-success" /> : <EyeOff size={15} className="is-muted" />}
            </button>
            <button type="button" aria-label={`Centrar ${token.name}`} title="Centrar" onClick={(event) => { event.stopPropagation(); onCenter(token.id) }}><Crosshair size={16} /></button>
          </article>
        ))}
      </div>

      <details className="dm-inline-create">
        <summary><Plus size={15} /> Colocar criatura</summary>
        <div className="dm-inline-create__body">
          <label>NPC<input value={npcName} onChange={(event) => onNpcNameChange(event.target.value)} /></label>
          <label>Rol<input value={npcRole} onChange={(event) => onNpcRoleChange(event.target.value)} /></label>
          <button type="button" onClick={onCreateNpc}><UserRoundCog size={16} /> Crear NPC</button>
          <label>Enemigo<input value={enemyName} onChange={(event) => onEnemyNameChange(event.target.value)} /></label>
          <label>HP<input inputMode="numeric" value={enemyHp} onChange={(event) => onEnemyHpChange(event.target.value)} /></label>
          <button type="button" className="is-danger" onClick={onCreateEnemy}><Skull size={16} /> Crear enemigo</button>
        </div>
      </details>
      {status ? <p className="dm-inline-status" role="status">{status}</p> : null}
    </section>
  )
}
