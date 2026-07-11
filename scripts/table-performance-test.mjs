import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
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
  new URL('../client/src/features/game/vision-geometry.ts', import.meta.url),
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
  `dm-table-benchmark-${Date.now()}-${Math.random().toString(16).slice(2)}.mjs`,
)
await writeFile(transpiledPath, output, 'utf8')

try {
  const geometry = await import(pathToFileURL(transpiledPath).href)
  const mapWidth = 4096
  const mapHeight = 2304
  const occluders = buildReferenceOccluders(120, mapWidth, mapHeight)
  const origins = Array.from({ length: 12 }, (_, index) => ({
    x: 240 + (index % 4) * 920,
    y: 220 + Math.floor(index / 4) * 780,
  }))
  const samples = []
  let polygonCount = 0

  for (let frame = 0; frame < 30; frame += 1) {
    const startedAt = performance.now()
    for (const origin of origins) {
      const polygon = geometry.calculateVisibilityPolygon({
        origin,
        range: 760,
        mapWidth,
        mapHeight,
        occluders,
      })
      assert.ok(polygon.length >= 3)
      polygonCount += 1
    }
    samples.push(performance.now() - startedAt)
  }

  samples.sort((left, right) => left - right)
  const p95 = samples[Math.min(samples.length - 1, Math.ceil(samples.length * 0.95) - 1)]
  const average = samples.reduce((sum, value) => sum + value, 0) / samples.length
  const result = {
    scene: 'reference-4k-120-occluders-12-origins',
    frames: samples.length,
    polygons: polygonCount,
    averageFrameMs: round(average),
    p95FrameMs: round(p95),
    targetP95Ms: 250,
  }

  assert.ok(
    p95 < result.targetP95Ms,
    `Reference geometry p95 ${result.p95FrameMs}ms exceeds ${result.targetP95Ms}ms`,
  )
  console.log(JSON.stringify(result))
} finally {
  await unlink(transpiledPath)
}

function buildReferenceOccluders(count, width, height) {
  return Array.from({ length: count }, (_, index) => {
    const column = index % 15
    const row = Math.floor(index / 15)
    const x = 180 + column * ((width - 360) / 15)
    const y = 160 + row * ((height - 320) / 8)
    const horizontal = index % 2 === 0
    return {
      id: `benchmark-${index}`,
      name: `Wall ${index}`,
      kind: index % 11 === 0 ? 'door' : 'wall',
      open: index % 22 === 0,
      x1: x,
      y1: y,
      x2: horizontal ? Math.min(width, x + 180) : x,
      y2: horizontal ? y : Math.min(height, y + 180),
      blocksSight: true,
      blocksLight: true,
    }
  })
}

function round(value) {
  return Math.round(value * 100) / 100
}
