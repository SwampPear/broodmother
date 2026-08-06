import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const SITE = 'http://127.0.0.1:6767'

/** How long to keep asking whether the site is up before giving up on opening it. The
 *  server is still starting either way; this only decides whether a window appears. */
const TRIES = 120
const EVERY_MS = 250

const OPENER: Record<string, string> = { darwin: 'open', win32: 'explorer' }

/**
 * The app, and a window pointed at it. Only an explicit path pins the vault: without one the
 * server opens the vault it opened last, and where you happen to be standing in a shell has
 * nothing to do with which notes you meant.
 */
export function start(vault: string | null): void {
  const pinned = vault ? resolve(vault) : null
  process.stdout.write(`broodmother → ${pinned ?? 'the vault you had open'}\n`)

  const child = spawn('npm', ['run', 'localhost'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...(pinned ? { BROODMOTHER_VAULT: pinned } : {}) },
  })

  // Whatever runs the app kills its own children on a signal; the job here is to make sure
  // it always gets one, including when this wrapper dies for a reason it never sees coming.
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const)
    process.on(signal, () => child.kill(signal))
  process.on('exit', () => child.kill('SIGTERM'))
  child.on('exit', (code) => process.exit(code ?? 0))

  void openWhenUp()
}

async function openWhenUp(): Promise<void> {
  for (let attempt = 0; attempt < TRIES; attempt++) {
    await new Promise((done) => setTimeout(done, EVERY_MS))
    const up = await fetch(SITE).then(
      () => true,
      () => false,
    )
    if (!up) continue
    const opener = OPENER[process.platform] ?? 'xdg-open'
    spawn(opener, [SITE], { stdio: 'ignore', detached: true }).unref()
    return
  }
}
