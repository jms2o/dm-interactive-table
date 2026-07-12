import { Image, Music, Plus, RefreshCw, Search, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { AssetLibraryResponse, AssetLibraryType } from '../../../../../../shared/types/asset'

export function AssetsPanel({
  library,
  type,
  name,
  url,
  status,
  onTypeChange,
  onNameChange,
  onUrlChange,
  onCreate,
  onRefresh,
}: {
  library: AssetLibraryResponse | null
  type: AssetLibraryType
  name: string
  url: string
  status: string
  onTypeChange: (value: AssetLibraryType) => void
  onNameChange: (value: string) => void
  onUrlChange: (value: string) => void
  onCreate: () => void
  onRefresh: () => void
}) {
  const [query, setQuery] = useState('')
  const assets = useMemo(
    () => (library?.assets ?? []).filter((asset) => asset.name.toLowerCase().includes(query.trim().toLowerCase())),
    [library?.assets, query],
  )

  return (
    <section className="dm-assets-panel" aria-labelledby="assets-panel-title">
      <header><div><span className="dm-kicker">Biblioteca</span><h3 id="assets-panel-title">Assets</h3></div><button type="button" title="Actualizar" aria-label="Actualizar assets" onClick={onRefresh}><RefreshCw size={16} /></button></header>
      <label className="dm-search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar asset" /></label>
      <div className="dm-asset-grid">
        {assets.slice(0, 16).map((asset) => (
          <article key={asset.id}>
            <div className="dm-asset-preview">
              {asset.type === 'map' || asset.type === 'token' || asset.type === 'portrait' ? <img src={asset.url} alt="" /> : <Music size={22} />}
            </div>
            <strong title={asset.name}>{asset.name}</strong>
            <small>{asset.type} · {asset.status}</small>
          </article>
        ))}
      </div>
      {assets.length === 0 ? <div className="dm-empty-state dm-empty-state--compact"><Image size={21} /><p>No hay assets para esta búsqueda.</p></div> : null}
      <details className="dm-inline-create"><summary><Plus size={15} /> Registrar asset</summary><div className="dm-inline-create__body">
        <label>Tipo<select value={type} onChange={(event) => onTypeChange(event.target.value as AssetLibraryType)}>{['map','token','portrait','music','sound','effect'].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Nombre<input value={name} onChange={(event) => onNameChange(event.target.value)} /></label>
        <label>URL<input value={url} onChange={(event) => onUrlChange(event.target.value)} /></label>
        <button type="button" onClick={onCreate}><Upload size={16} /> Registrar</button>
      </div></details>
      {status ? <p className="dm-inline-status" role="status">{status}</p> : null}
    </section>
  )
}
