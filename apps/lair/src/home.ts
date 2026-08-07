import { randomBytes } from 'node:crypto'
import { mkdir, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execa } from 'execa'
import { atomicWrite } from '@broodmother/server'

/** Where the lair keeps everything: token, keys, clones, dreams, run history. */
export function lairHome(): string {
  return process.env.LAIR_HOME ?? path.join(os.homedir(), '.lair')
}

export interface LairHome {
  root: string
  sites: string
  dreams: string
  runs: string
  adminToken: string
  /** Printed exactly once, the boot that minted it — after that it is a file at 0600. */
  minted: boolean
  /** The lair's own ed25519, for cloning as a deploy key. Null when ssh-keygen failed. */
  sshKeyPath: string | null
  publicKey: string | null
}

export async function openHome(root: string): Promise<LairHome> {
  const sites = path.join(root, 'sites')
  const dreams = path.join(root, 'dreams')
  const runs = path.join(root, 'runs')
  for (const dir of [root, sites, dreams, runs]) await mkdir(dir, { recursive: true })

  const tokenFile = path.join(root, 'admin.token')
  let adminToken = await readFile(tokenFile, 'utf8').then(
    (text) => text.trim(),
    () => '',
  )
  const minted = adminToken === ''
  if (minted) {
    adminToken = randomBytes(32).toString('hex')
    await atomicWrite(tokenFile, `${adminToken}\n`, 0o600)
  }

  const keyPath = path.join(root, 'key')
  let publicKey = await readFile(`${keyPath}.pub`, 'utf8').then(
    (text) => text.trim() || null,
    () => null,
  )
  if (!publicKey) {
    const made = await execa(
      'ssh-keygen',
      ['-t', 'ed25519', '-f', keyPath, '-N', '', '-C', 'lair@broodmother', '-q'],
      { reject: false, timeout: 30_000 },
    )
    if (made.exitCode === 0)
      publicKey = (await readFile(`${keyPath}.pub`, 'utf8')).trim() || null
  }

  return {
    root,
    sites,
    dreams,
    runs,
    adminToken,
    minted,
    sshKeyPath: publicKey ? keyPath : null,
    publicKey,
  }
}
