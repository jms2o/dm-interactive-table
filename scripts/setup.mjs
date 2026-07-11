import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const isWindows = process.platform === 'win32'
const serverEnvPath = resolve(root, 'server', '.env')

if (!existsSync(serverEnvPath)) {
  const secret = randomBytes(32).toString('hex')
  await writeFile(
    serverEnvPath,
    [
      'NODE_ENV=development',
      'PORT=4000',
      'CLIENT_ORIGIN=http://localhost:5173',
      `AUTH_SECRET=${secret}`,
      'JWT_ISSUER=dm-interactive-table',
      'JWT_AUDIENCE=dm-interactive-table-client',
      'SESSION_TTL_HOURS=12',
      'TABLE_CODE_TTL_MINUTES=720',
      'COOKIE_SECURE=false',
      'DATA_DIR=data',
      'JSON_LIMIT=256kb',
      'TRUST_PROXY=false',
      '',
      '# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dm_interactive_table?schema=public',
      '',
    ].join('\n'),
    'utf8',
  )
}

runNpm(['install'])
runNpm(['run', 'prisma:generate', '--workspace', 'server'])

console.log('\nSetup complete.')
console.log('Run: npm run dev')
console.log('Open: http://localhost:5173/dm')

function runNpm(args, cwd = root) {
  const command = isWindows ? (process.env.ComSpec ?? 'cmd.exe') : 'npm'
  const commandArgs = isWindows
    ? ['/d', '/s', '/c', `npm ${args.join(' ')}`]
    : args
  const result = spawnSync(command, commandArgs, {
    cwd,
    stdio: 'inherit',
    shell: false,
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}
