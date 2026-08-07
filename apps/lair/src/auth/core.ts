import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { atomicWrite } from '@broodmother/server'
import type { LairKey, LairKeyGrant } from '@broodmother/shared'

export class AuthError extends Error {}

interface StoredKey extends LairKey {
  sha256: string
}

const hash = (key: string) => createHash('sha256').update(key).digest('hex')

/** Constant-time, padded so a wrong length is a mismatch rather than an exception. */
export function sameSecret(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

/**
 * The keys the lair admits, hashed at rest: this file leaking is names and dates, not
 * access. The key itself exists in two places only — the answer to the mint, and
 * whatever profile file the holder pasted it into.
 */
export class Keys {
  constructor(
    private readonly file: string,
    private readonly now: () => number = Date.now,
  ) {}

  private async load(): Promise<StoredKey[]> {
    const raw: unknown = await readFile(this.file, 'utf8')
      .then(JSON.parse)
      .catch(() => [])
    return Array.isArray(raw) ? (raw as StoredKey[]) : []
  }

  private async save(keys: StoredKey[]): Promise<void> {
    await atomicWrite(this.file, `${JSON.stringify(keys, null, 2)}\n`, 0o600)
  }

  async list(): Promise<LairKey[]> {
    return (await this.load()).map(({ id, name, createdAt }) => ({
      id,
      name,
      createdAt,
    }))
  }

  async mint(name: string): Promise<LairKeyGrant> {
    if (!name.trim()) throw new AuthError('a key needs a name — whose is it?')
    const keys = await this.load()
    const id = `k-${randomBytes(4).toString('hex')}`
    const key = `lk_${randomBytes(24).toString('hex')}`
    keys.push({ id, name: name.trim(), sha256: hash(key), createdAt: this.now() })
    await this.save(keys)
    return { id, name: name.trim(), key }
  }

  async revoke(id: string): Promise<LairKey[]> {
    const keys = await this.load()
    const kept = keys.filter((key) => key.id !== id)
    if (kept.length === keys.length) throw new AuthError(`no key ${id}`)
    await this.save(kept)
    return kept.map(({ id: kid, name, createdAt }) => ({ id: kid, name, createdAt }))
  }

  async holds(key: string): Promise<boolean> {
    if (!key) return false
    const wanted = hash(key)
    return (await this.load()).some((stored) => sameSecret(stored.sha256, wanted))
  }
}
