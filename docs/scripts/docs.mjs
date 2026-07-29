#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const vault = resolve(process.argv[2] ?? process.env.DOCS_VAULT ?? process.cwd())
const site = 'http://127.0.0.1:3000'

process.stdout.write(`docs → vault ${vault}\n`)

const child = spawn('npm', ['run', 'dev'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, DOCS_VAULT: vault },
})

// concurrently kills its own children on signal; the job here is to make sure it always
// gets one, including when this wrapper dies for a reason it never sees coming.
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'])
  process.on(signal, () => child.kill(signal))
process.on('exit', () => child.kill('SIGTERM'))

child.on('exit', (code) => process.exit(code ?? 0))

const opener = { darwin: 'open', win32: 'explorer' }[process.platform] ?? 'xdg-open'

for (let attempt = 0; attempt < 120; attempt++) {
  await new Promise((done) => setTimeout(done, 250))
  const up = await fetch(site).then(
    () => true,
    () => false,
  )
  if (!up) continue
  spawn(opener, [site], { stdio: 'ignore', detached: true }).unref()
  break
}
