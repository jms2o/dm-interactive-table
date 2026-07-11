import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parse } from 'yaml'

const root = resolve(import.meta.dirname, '..')
const rootPackage = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const openApi = parse(
  await readFile(resolve(root, 'docs', 'api', 'openapi.yaml'), 'utf8'),
)
const compose = parse(
  await readFile(resolve(root, 'docker-compose.yml'), 'utf8'),
)

assert.equal(openApi.openapi, '3.1.0')
assert.equal(openApi.info.version, rootPackage.version)
assert.ok(openApi.paths['/auth/login'])
assert.ok(openApi.paths['/table-access/join'])
assert.ok(openApi.components.securitySchemes.bearerAuth)

assert.ok(compose.services.database)
assert.ok(compose.services.app)
assert.equal(compose.services.app.depends_on.database.condition, 'service_healthy')
assert.ok(compose.services.app.healthcheck)
assert.ok(compose.volumes.postgres_data !== undefined)

console.log('Documentation contracts are valid')
