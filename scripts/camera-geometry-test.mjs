import assert from 'node:assert/strict'
import { readFile, unlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const requireFromClient = createRequire(
  new URL('../client/package.json', import.meta.url),
)
const ts = requireFromClient('typescript')
const source = await readFile(
  new URL('../client/src/features/game/map-camera.ts', import.meta.url),
  'utf8',
)
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText
const transpiledPath = join(
  tmpdir(),
  `dm-map-camera-${Date.now()}-${Math.random().toString(16).slice(2)}.mjs`,
)
await writeFile(transpiledPath, output, 'utf8')
const camera = await import(pathToFileURL(transpiledPath).href)

const mapPoint = camera.screenToMap(
  { x: 300, y: 250 },
  { x: 100, y: 50, zoom: 2 },
  0.5,
)
assert.deepEqual(mapPoint, { x: 200, y: 200 })

const initial = { x: -80, y: 40, zoom: 1.25 }
const cursor = { x: 420, y: 280 }
const beforeZoom = camera.screenToMap(cursor, initial, 1)
const zoomed = camera.zoomCameraAtPoint({
  camera: initial,
  nextZoom: 2.5,
  point: cursor,
  minZoom: 0.5,
  maxZoom: 3,
})
const afterZoom = camera.screenToMap(cursor, zoomed, 1)
assert.ok(Math.abs(beforeZoom.x - afterZoom.x) < 0.0001)
assert.ok(Math.abs(beforeZoom.y - afterZoom.y) < 0.0001)

const clamped = camera.zoomCameraAtPoint({
  camera: initial,
  nextZoom: 20,
  point: cursor,
  minZoom: 0.5,
  maxZoom: 3,
})
assert.equal(clamped.zoom, 3)

const framed = camera.frameMapBounds({
  bounds: { minX: 200, minY: 100, maxX: 600, maxY: 500 },
  baseScale: 0.8,
  viewportWidth: 1120,
  viewportHeight: 720,
  padding: 120,
  minZoom: 0.5,
  maxZoom: 3,
})
const framedCenter = {
  x: ((200 + 600) / 2) * 0.8 * framed.zoom + framed.x,
  y: ((100 + 500) / 2) * 0.8 * framed.zoom + framed.y,
}
assert.ok(Math.abs(framedCenter.x - 560) < 0.0001)
assert.ok(Math.abs(framedCenter.y - 360) < 0.0001)

const centered = camera.centerCameraOnMapPoint({
  camera: { x: 0, y: 0, zoom: 2 },
  mapPoint: { x: 700, y: 450 },
  baseScale: 0.8,
  viewportWidth: 1120,
  viewportHeight: 720,
})
const centeredScreenPoint = {
  x: 700 * 0.8 * centered.zoom + centered.x,
  y: 450 * 0.8 * centered.zoom + centered.y,
}
assert.deepEqual(centeredScreenPoint, { x: 560, y: 360 })

console.log('Map camera geometry tests passed')
await unlink(transpiledPath)
