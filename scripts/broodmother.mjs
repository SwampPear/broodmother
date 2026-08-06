#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// The CLI is TypeScript like everything else here and there is no build step, so the thing
// npm puts on the PATH is a shim that hands its arguments to tsx.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const child = spawn(
  resolve(root, 'node_modules/.bin/tsx'),
  [resolve(root, 'apps/cli/src/main.ts'), ...process.argv.slice(2)],
  { cwd: root, stdio: 'inherit' },
)

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'])
  process.on(signal, () => child.kill(signal))

child.on('exit', (code) => process.exit(code ?? 0))
