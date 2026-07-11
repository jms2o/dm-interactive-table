import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Heart, Minus, Plus, Save, Shield, Sparkles } from 'lucide-react'
import type { PlayerCharacterSheet } from '../../../../shared/types/session-workflow'
import { getJson, sendJson } from './api'

type CharacterSheetPanelProps = {
  campaignId: string
  compact?: boolean
}

export function CharacterSheetPanel({
  campaignId,
  compact = false,
}: CharacterSheetPanelProps) {
  const [sheet, setSheet] = useState<PlayerCharacterSheet | null>(null)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    void getJson<PlayerCharacterSheet>(
      `/campaigns/${encodeURIComponent(campaignId)}/workflow/character-sheet`,
    )
      .then((loaded) => {
        if (active) setSheet(loaded)
      })
      .catch((error) => {
        if (active) setStatus(messageFrom(error))
      })
    return () => {
      active = false
    }
  }, [campaignId])

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!sheet) return
    setSaving(true)
    setStatus('')
    try {
      const updated = await sendJson<PlayerCharacterSheet>(
        `/campaigns/${encodeURIComponent(campaignId)}/workflow/character-sheet`,
        'PATCH',
        {
          name: sheet.name,
          ancestry: sheet.ancestry,
          className: sheet.className,
          level: sheet.level,
          maxHp: sheet.maxHp,
          currentHp: sheet.currentHp,
          temporaryHp: sheet.temporaryHp,
          armorClass: sheet.armorClass,
          notes: sheet.notes,
          resources: sheet.resources,
        },
      )
      setSheet(updated)
      setStatus('Hoja guardada')
    } catch (error) {
      setStatus(messageFrom(error))
    } finally {
      setSaving(false)
    }
  }

  if (!sheet) {
    return (
      <section className="character-sheet character-sheet--loading">
        <span className="auth-loader" aria-label="Cargando hoja" />
        {status ? <p className="auth-error">{status}</p> : null}
      </section>
    )
  }

  function update<K extends keyof PlayerCharacterSheet>(
    key: K,
    value: PlayerCharacterSheet[K],
  ) {
    setSheet((current) => (current ? { ...current, [key]: value } : current))
  }

  return (
    <form
      className={`character-sheet ${compact ? 'character-sheet--compact' : ''}`}
      onSubmit={save}
    >
      <header className="character-sheet__header">
        <div>
          <span className="section-label">Personaje</span>
          <input
            className="character-name-input"
            aria-label="Nombre del personaje"
            value={sheet.name}
            onChange={(event) => update('name', event.target.value)}
            maxLength={80}
          />
        </div>
        <button
          type="submit"
          className="icon-button"
          title="Guardar hoja"
          aria-label="Guardar hoja"
          disabled={saving}
        >
          <Save size={18} />
        </button>
      </header>

      <div className="character-identity-grid">
        <label>
          Linaje
          <input
            value={sheet.ancestry}
            onChange={(event) => update('ancestry', event.target.value)}
            maxLength={80}
          />
        </label>
        <label>
          Clase
          <input
            value={sheet.className}
            onChange={(event) => update('className', event.target.value)}
            maxLength={80}
          />
        </label>
      </div>

      <div className="character-stat-grid">
        <StatControl
          icon={<Sparkles size={17} />}
          label="Nivel"
          value={sheet.level}
          min={1}
          max={30}
          onChange={(value) => update('level', value)}
        />
        <StatControl
          icon={<Shield size={17} />}
          label="CA"
          value={sheet.armorClass}
          min={0}
          max={99}
          onChange={(value) => update('armorClass', value)}
        />
      </div>

      <div className="hp-control">
        <div className="hp-control__label">
          <Heart size={18} />
          <span>HP</span>
        </div>
        <button
          type="button"
          className="icon-button"
          title="Restar un HP"
          aria-label="Restar un HP"
          onClick={() => update('currentHp', Math.max(0, sheet.currentHp - 1))}
        >
          <Minus size={16} />
        </button>
        <input
          aria-label="HP actual"
          type="number"
          min={0}
          max={sheet.maxHp}
          value={sheet.currentHp}
          onChange={(event) => update('currentHp', numberValue(event.target.value, 0))}
        />
        <span>/</span>
        <input
          aria-label="HP máximo"
          type="number"
          min={1}
          max={9999}
          value={sheet.maxHp}
          onChange={(event) => update('maxHp', numberValue(event.target.value, 1))}
        />
        <button
          type="button"
          className="icon-button"
          title="Sumar un HP"
          aria-label="Sumar un HP"
          onClick={() =>
            update('currentHp', Math.min(sheet.maxHp, sheet.currentHp + 1))
          }
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="character-resource-grid">
        <label>
          HP temporal
          <input
            type="number"
            min={0}
            max={9999}
            value={sheet.temporaryHp}
            onChange={(event) =>
              update('temporaryHp', numberValue(event.target.value, 0))
            }
          />
        </label>
        <label>
          Inspiración
          <input
            type="number"
            min={0}
            max={9}
            value={sheet.resources.inspiration ?? 0}
            onChange={(event) =>
              update('resources', {
                ...sheet.resources,
                inspiration: numberValue(event.target.value, 0),
              })
            }
          />
        </label>
      </div>

      {!compact ? (
        <label>
          Notas
          <textarea
            rows={4}
            value={sheet.notes}
            onChange={(event) => update('notes', event.target.value)}
            maxLength={5000}
          />
        </label>
      ) : null}

      {status ? <p className="character-sheet__status">{status}</p> : null}
    </form>
  )
}

function StatControl({
  icon,
  label,
  value,
  min,
  max,
  onChange,
}: {
  icon: ReactNode
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <label className="character-stat">
      <span>{icon}{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(numberValue(event.target.value, min))}
      />
    </label>
  )
}

function numberValue(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : 'No se pudo cargar la hoja'
}
