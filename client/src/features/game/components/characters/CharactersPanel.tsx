import { Crosshair, HeartPulse, UserRound, Wifi, WifiOff } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { SessionParticipant } from '../../../../../../shared/types/session-workflow'
import type { GameToken } from '../../../../../../shared/types/token'

type CharacterFilter = 'all' | 'connected' | 'disconnected' | 'injured' | 'down'

export function CharactersPanel({
  tokens,
  participants,
  onSelect,
  onCenter,
}: {
  tokens: GameToken[]
  participants: SessionParticipant[]
  onSelect: (tokenId: string) => void
  onCenter: (tokenId: string) => void
}) {
  const [filter, setFilter] = useState<CharacterFilter>('all')
  const connectedNames = useMemo(
    () => new Set(participants.map((participant) => participant.displayName.toLowerCase())),
    [participants],
  )
  const filtered = tokens.filter((token) => {
    const connected = connectedNames.has(token.name.toLowerCase())
    if (filter === 'connected') return connected
    if (filter === 'disconnected') return !connected
    if (filter === 'injured' || filter === 'down') return false
    return true
  })

  return (
    <section className="dm-list-panel" aria-labelledby="characters-panel-title">
      <header>
        <div>
          <span className="dm-kicker">Grupo</span>
          <h3 id="characters-panel-title">Personajes</h3>
        </div>
        <span>{tokens.length}</span>
      </header>
      <div className="dm-filter-row" role="group" aria-label="Filtrar personajes">
        {(['all', 'connected', 'disconnected', 'injured', 'down'] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={filter === item ? 'is-active' : ''}
            disabled={item === 'injured' || item === 'down'}
            title={item === 'injured' || item === 'down' ? 'Requiere HP de personaje en la escena' : undefined}
            onClick={() => setFilter(item)}
          >
            {characterFilterLabel(item)}
          </button>
        ))}
      </div>
      <div className="dm-entity-list">
        {filtered.map((token) => {
          const connected = connectedNames.has(token.name.toLowerCase())
          return (
            <article key={token.id} className="dm-entity-row">
              <button type="button" className="dm-entity-row__select" onClick={() => onSelect(token.id)}>
                <span className="dm-entity-avatar" style={{ background: token.color }}><UserRound size={17} /></span>
                <span className="dm-entity-row__body">
                  <strong>{token.name}</strong>
                  <small>{connected ? 'Conectado' : 'Token sin jugador enlazado'}</small>
                </span>
                <span className={connected ? 'is-success' : 'is-muted'} title={connected ? 'Conectado' : 'Desconectado'}>
                  {connected ? <Wifi size={15} /> : <WifiOff size={15} />}
                </span>
              </button>
              <button
                type="button"
                aria-label={`Centrar ${token.name}`}
                title="Centrar en el mapa"
                onClick={(event) => { event.stopPropagation(); onCenter(token.id) }}
              >
                <Crosshair size={16} />
              </button>
            </article>
          )
        })}
      </div>
      {filtered.length === 0 ? (
        <div className="dm-empty-state dm-empty-state--compact"><HeartPulse size={20} /><p>No hay personajes para este filtro.</p></div>
      ) : null}
    </section>
  )
}

function characterFilterLabel(filter: CharacterFilter) {
  if (filter === 'all') return 'Todos'
  if (filter === 'connected') return 'Conectados'
  if (filter === 'disconnected') return 'Sin enlace'
  if (filter === 'injured') return 'Heridos'
  return 'Fuera'
}
