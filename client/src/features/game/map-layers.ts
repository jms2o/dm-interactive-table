export type MapLayerId = 'map' | 'grid' | 'lighting' | 'tokens' | 'vision' | 'fog'

export type MapLayerSetting = {
  id: MapLayerId
  label: string
  visible: boolean
  locked: boolean
  order: number
}

export const DEFAULT_MAP_LAYERS: MapLayerSetting[] = [
  { id: 'map', label: 'Mapa', visible: true, locked: true, order: 0 },
  { id: 'grid', label: 'Cuadrícula', visible: true, locked: true, order: 1 },
  { id: 'lighting', label: 'Iluminación', visible: true, locked: true, order: 2 },
  { id: 'tokens', label: 'Tokens', visible: true, locked: false, order: 3 },
  { id: 'vision', label: 'Obstáculos', visible: true, locked: false, order: 4 },
  { id: 'fog', label: 'Niebla', visible: true, locked: true, order: 5 },
]

export function moveMapLayer(
  layers: MapLayerSetting[],
  layerId: MapLayerId,
  direction: -1 | 1,
): MapLayerSetting[] {
  const ordered = [...layers].sort((left, right) => left.order - right.order)
  const index = ordered.findIndex((layer) => layer.id === layerId)
  const targetIndex = index + direction

  if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
    return layers
  }

  const currentOrder = ordered[index].order
  ordered[index] = { ...ordered[index], order: ordered[targetIndex].order }
  ordered[targetIndex] = { ...ordered[targetIndex], order: currentOrder }
  return ordered
}
