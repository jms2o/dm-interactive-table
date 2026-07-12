import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '..')
const read = (...parts) => readFile(resolve(root, ...parts), 'utf8')

test('DM Command Center keeps its component boundaries', async () => {
  const components = [
    'DmCommandCenter.tsx',
    'DmTopStatusBar.tsx',
    'DmSideNav.tsx',
    'DmMapViewport.tsx',
    'DmContextPanel.tsx',
    'DmTimelineBar.tsx',
    'DmSystemStatusBar.tsx',
  ]

  for (const component of components) {
    const source = await read(
      'client',
      'src',
      'features',
      'game',
      'components',
      'command-center',
      component,
    )
    assert.ok(source.length > 100, `${component} should not be empty`)
  }
})

test('workspace reuses realtime state and preserves advanced tools', async () => {
  const workspace = await read(
    'client',
    'src',
    'features',
    'game',
    'GameWorkspace.tsx',
  )

  assert.match(workspace, /<DmCommandCenter/)
  assert.match(workspace, /<DmAdvancedTools enabled=\{isDm\}>/)
  assert.match(workspace, /useRealtimeGame\(/)
  assert.match(workspace, /useDmWorkspace\(/)
  assert.doesNotMatch(workspace, /<HistoryControls/)
})

test('map renders the configured image and exposes token selection', async () => {
  const board = await read(
    'client',
    'src',
    'features',
    'game',
    'components',
    'GameBoard.tsx',
  )

  assert.match(board, /Image as KonvaImage/)
  assert.match(board, /resolvedMapImageUrl/)
  assert.match(board, /onTokenSelect\?:/)
  assert.match(board, /focusedTokenId\?:/)
})

test('theme defines stable desktop and tablet geometry', async () => {
  const theme = await read('client', 'src', 'styles', 'dm-theme.css')

  assert.match(theme, /grid-template-columns: var\(--dm-nav-width\)/)
  assert.match(theme, /grid-column: 2;/)
  assert.match(theme, /grid-column: 3;/)
  assert.match(theme, /@media \(max-width: 1366px\)/)
  assert.match(theme, /@media \(max-width: 1120px\)/)
  assert.match(theme, /\.dm-command-center \.modal-backdrop/)
  assert.doesNotMatch(theme, /letter-spacing:\s*-/)
})

test('unsupported map commands remain explicitly disabled', async () => {
  const viewport = await read(
    'client',
    'src',
    'features',
    'game',
    'components',
    'command-center',
    'DmMapViewport.tsx',
  )

  for (const label of [
    'Colocar marcador',
    'Añadir texto',
    'Medición',
  ]) {
    assert.ok(viewport.includes(label))
  }
  assert.ok((viewport.match(/disabled/g) ?? []).length >= 3)
})
