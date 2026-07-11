import { rm } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const dataDir = resolve(root, 'tmp', 'e2e-data')
const isWindows = process.platform === 'win32'
const command = isWindows ? (process.env.ComSpec ?? 'cmd.exe') : 'npm'
const commandArgs = isWindows
  ? ['/d', '/s', '/c', 'npm run start --workspace server']
  : ['run', 'start', '--workspace', 'server']

await rm(dataDir, { recursive: true, force: true })

const child = spawn(command, commandArgs, {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: '4173',
    CLIENT_ORIGIN: 'http://127.0.0.1:4173',
    DATABASE_URL: process.env.E2E_DATABASE_URL ?? '',
    DATA_DIR: dataDir,
    AUTH_SECRET:
      process.env.AUTH_SECRET ??
      'e2e-auth-secret-with-at-least-32-characters',
    COOKIE_SECURE: 'false',
  },
  stdio: 'inherit',
  shell: false,
})

child.on('exit', (code) => process.exit(code ?? 1))

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal))
}
