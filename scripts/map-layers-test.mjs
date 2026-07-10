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
  new URL('../client/src/features/game/map-layers.ts', import.meta.url),
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
  `dm-map-layers-${Date.now()}-${Math.random().toString(16).slice(2)}.mjs`,
)
await writeFile(transpiledPath, output, 'utf8')
const layersModule = await import(pathToFileURL(transpiledPath).href)

const defaults = layersModule.DEFAULT_MAP_LAYERS.map((layer) => ({ ...layer }))
const moved = layersModule.moveMapLayer(defaults, 'tokens', 1)
const orderedIds = [...moved]
  .sort((left, right) => left.order - right.order)
  .map((layer) => layer.id)
assert.deepEqual(orderedIds, [
  'map',
  'grid',
  'lighting',
  'vision',
  'tokens',
  'fog',
])
assert.equal(new Set(moved.map((layer) => layer.order)).size, moved.length)
assert.equal(layersModule.moveMapLayer(defaults, 'map', -1), defaults)
assert.equal(layersModule.moveMapLayer(defaults, 'fog', 1), defaults)

console.log('Map layer tests passed')
await unlink(transpiledPath)
