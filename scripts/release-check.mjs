import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parse } from 'yaml'

const root = resolve(import.meta.dirname, '..')
const readText = (...parts) => readFile(resolve(root, ...parts), 'utf8')
const readJson = async (...parts) => JSON.parse(await readText(...parts))

const rootPackage = await readJson('package.json')
const expectedVersion = rootPackage.version
assert.match(expectedVersion, /^\d+\.\d+\.\d+-alpha\.\d+$/)

for (const parts of [
  ['client', 'package.json'],
  ['server', 'package.json'],
]) {
  const manifest = await readJson(...parts)
  assert.equal(
    manifest.version,
    expectedVersion,
    `${parts.join('/')} version is not aligned`,
  )
  if (manifest.packages?.['']?.version) {
    assert.equal(
      manifest.packages[''].version,
      expectedVersion,
      `${parts.join('/')} root lock version is not aligned`,
    )
  }
}

assert.deepEqual(rootPackage.workspaces, ['client', 'server'])
const rootLock = await readJson('package-lock.json')
assert.equal(rootLock.version, expectedVersion)
assert.equal(rootLock.packages?.['']?.version, expectedVersion)
assert.equal(rootLock.packages?.client?.version, expectedVersion)
assert.equal(rootLock.packages?.server?.version, expectedVersion)

const sharedVersion = await readText('shared', 'version.ts')
assert.match(
  sharedVersion,
  new RegExp(`APP_VERSION = ["']${escapeRegex(expectedVersion)}["']`),
)

const readme = await readText('README.md')
const docsReadme = await readText('docs', 'README.md')
const changelog = await readText('CHANGELOG.md')
const implementation = await readText(
  'docs',
  'implementation',
  'phase-2.0-table-device-experience.md',
)
assert.ok(readme.includes(`\`${expectedVersion} - Table Device Experience\``))
assert.ok(docsReadme.includes(`\`${expectedVersion}\``))
assert.equal(
  changelog.match(/^## \[([^\]]+)\]/m)?.[1],
  expectedVersion,
  'Latest changelog entry is not the current version',
)
assert.ok(implementation.includes(expectedVersion))

const openApi = parse(await readText('docs', 'api', 'openapi.yaml'))
assert.equal(openApi.info.version, expectedVersion)

const appSource = await readText('server', 'src', 'app.ts')
const demoSource = await readText(
  'server',
  'src',
  'modules',
  'demo',
  'demo.service.ts',
)
const packageSource = await readText(
  'server',
  'src',
  'modules',
  'campaign-package',
  'campaign-package.service.ts',
)
assert.ok(appSource.includes('APP_VERSION'))
assert.ok(demoSource.includes('APP_VERSION as DEMO_VERSION'))
assert.ok(packageSource.includes('CAMPAIGN_PACKAGE_SCHEMA_VERSION'))

console.log(`Release consistency passed for ${expectedVersion}`)

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
