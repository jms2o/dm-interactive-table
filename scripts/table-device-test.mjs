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
  new URL('../client/src/features/device/table-device.ts', import.meta.url),
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
  `dm-table-device-${Date.now()}-${Math.random().toString(16).slice(2)}.mjs`,
)
await writeFile(transpiledPath, output, 'utf8')

try {
  const device = await import(pathToFileURL(transpiledPath).href)
  const display = device.defaultTableDevicePreferences('display')
  const player = device.defaultTableDevicePreferences('player')
  assert.equal(display.profile, 'tv')
  assert.equal(display.calibrationEnabled, true)
  assert.equal(player.profile, 'phone')
  assert.equal(player.calibrationEnabled, false)
  assert.equal(device.convertCellUnit(1, 'in', 'cm'), 2.54)

  const width = device.calibratedBoardWidth({
    boardWidth: 1120,
    mapGridSize: 70,
    mapScale: 0.8,
    preferences: display,
  })
  assert.equal(width, 1920)

  const tablet = device.applyDeviceProfile(display, 'tablet')
  assert.equal(tablet.profile, 'tablet')
  assert.equal(tablet.pixelsPerInch, display.pixelsPerInch)
  assert.equal(tablet.cellSize, display.cellSize)
  console.log('Table device calibration tests passed')
} finally {
  await unlink(transpiledPath)
}
