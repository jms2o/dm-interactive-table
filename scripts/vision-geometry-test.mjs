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
const sourceUrl = new URL(
  '../client/src/features/game/vision-geometry.ts',
  import.meta.url,
)
const source = await readFile(sourceUrl, 'utf8')
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText
const transpiledPath = join(
  tmpdir(),
  `dm-vision-geometry-${Date.now()}-${Math.random().toString(16).slice(2)}.mjs`,
)
await writeFile(transpiledPath, output, 'utf8')
const geometry = await import(pathToFileURL(transpiledPath).href)

const origin = { x: 20, y: 50 }
const fullHeightWall = {
  id: 'wall',
  name: 'Wall',
  kind: 'wall',
  open: false,
  x1: 60,
  y1: 0,
  x2: 60,
  y2: 100,
  blocksSight: true,
  blocksLight: true,
}

const ranged = geometry.calculateVisibilityPolygon({
  origin: { x: 100, y: 100 },
  range: 40,
  mapWidth: 200,
  mapHeight: 200,
  occluders: [],
})
assert.ok(
  ranged.every((point) => Math.hypot(point.x - 100, point.y - 100) <= 40.001),
  'Visibility points must remain inside the configured range',
)

const blockedSight = geometry.calculateVisibilityPolygon({
  origin,
  range: 100,
  mapWidth: 100,
  mapHeight: 100,
  occluders: [fullHeightWall],
})
assert.ok(
  blockedSight.every((point) => point.x <= 60.001),
  'A full-height sight wall must stop every ray',
)

const lightOnlyWall = { ...fullHeightWall, blocksSight: false }
const unblockedSight = geometry.calculateVisibilityPolygon({
  origin,
  range: 100,
  mapWidth: 100,
  mapHeight: 100,
  occluders: [lightOnlyWall],
})
const blockedLight = geometry.calculateVisibilityPolygon({
  origin,
  range: 100,
  mapWidth: 100,
  mapHeight: 100,
  occluders: [lightOnlyWall],
  blocking: 'light',
})
assert.ok(unblockedSight.some((point) => point.x > 60.001))
assert.ok(blockedLight.every((point) => point.x <= 60.001))

const openDoor = {
  ...fullHeightWall,
  id: 'door',
  name: 'Door',
  kind: 'door',
  open: true,
}
const throughOpenDoor = geometry.calculateVisibilityPolygon({
  origin,
  range: 100,
  mapWidth: 100,
  mapHeight: 100,
  occluders: [openDoor],
})
assert.ok(
  throughOpenDoor.some((point) => point.x > 60.001),
  'An open door must not block sight rays',
)

console.log('Vision geometry tests passed')
await unlink(transpiledPath)
