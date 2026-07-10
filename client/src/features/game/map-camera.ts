export type MapCamera = { x: number; y: number; zoom: number }
export type MapPoint = { x: number; y: number }

export function screenToMap(
  point: MapPoint,
  camera: MapCamera,
  baseScale: number,
): MapPoint {
  return {
    x: (point.x - camera.x) / camera.zoom / baseScale,
    y: (point.y - camera.y) / camera.zoom / baseScale,
  }
}

export function zoomCameraAtPoint(input: {
  camera: MapCamera
  nextZoom: number
  point: MapPoint
  minZoom: number
  maxZoom: number
}): MapCamera {
  const zoom = clamp(input.nextZoom, input.minZoom, input.maxZoom)
  const scenePoint = {
    x: (input.point.x - input.camera.x) / input.camera.zoom,
    y: (input.point.y - input.camera.y) / input.camera.zoom,
  }

  return {
    zoom,
    x: input.point.x - scenePoint.x * zoom,
    y: input.point.y - scenePoint.y * zoom,
  }
}

export function frameMapBounds(input: {
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
  baseScale: number
  viewportWidth: number
  viewportHeight: number
  padding: number
  minZoom: number
  maxZoom: number
}): MapCamera {
  const minX = input.bounds.minX * input.baseScale
  const maxX = input.bounds.maxX * input.baseScale
  const minY = input.bounds.minY * input.baseScale
  const maxY = input.bounds.maxY * input.baseScale
  const width = Math.max(40, maxX - minX)
  const height = Math.max(40, maxY - minY)
  const zoom = clamp(
    Math.min(
      (input.viewportWidth - input.padding) / width,
      (input.viewportHeight - input.padding) / height,
    ),
    input.minZoom,
    input.maxZoom,
  )

  return {
    zoom,
    x: input.viewportWidth / 2 - ((minX + maxX) / 2) * zoom,
    y: input.viewportHeight / 2 - ((minY + maxY) / 2) * zoom,
  }
}

export function centerCameraOnMapPoint(input: {
  camera: MapCamera
  mapPoint: MapPoint
  baseScale: number
  viewportWidth: number
  viewportHeight: number
}): MapCamera {
  return {
    ...input.camera,
    x:
      input.viewportWidth / 2 -
      input.mapPoint.x * input.baseScale * input.camera.zoom,
    y:
      input.viewportHeight / 2 -
      input.mapPoint.y * input.baseScale * input.camera.zoom,
  }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value))
}
