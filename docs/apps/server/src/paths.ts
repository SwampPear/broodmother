import { realpath } from 'node:fs/promises'
import path from 'node:path'
import type { VaultPath } from '@docs/shared'

export class PathError extends Error {}

const RESERVED = new Set(['.git', '.docs'])

export function normalize(input: string): VaultPath {
  if (typeof input !== 'string' || input.length === 0) throw new PathError('empty path')
  if (input.includes('\0')) throw new PathError('path contains a null byte')
  if (input.includes('\\')) throw new PathError('path contains a backslash')
  if (path.isAbsolute(input) || /^[a-zA-Z]:/.test(input))
    throw new PathError('path must be relative to the vault root')

  const segments = input.split('/')
  for (const segment of segments) {
    if (segment === '' || segment === '.' || segment === '..')
      throw new PathError(`path segment not allowed: "${segment}"`)
    if (RESERVED.has(segment))
      throw new PathError(`path segment not allowed: "${segment}"`)
  }
  return segments.join('/')
}

function contains(root: string, target: string): boolean {
  return target === root || target.startsWith(root + path.sep)
}

/** realpath of the deepest existing ancestor, with the missing tail appended. */
async function resolveThroughSymlinks(target: string): Promise<string> {
  const missing: string[] = []
  let current = target
  for (;;) {
    try {
      return path.join(await realpath(current), ...missing)
    } catch {
      const parent = path.dirname(current)
      if (parent === current) return target
      missing.unshift(path.basename(current))
      current = parent
    }
  }
}

/**
 * The only place the vault boundary exists: paths arrive from a browser, so escapes are
 * rejected after symlink resolution rather than by inspecting the string alone.
 */
export async function resolveInVault(root: string, input: string): Promise<string> {
  const rel = normalize(input)
  const realRoot = await realpath(root)
  const target = path.resolve(realRoot, rel)
  if (!contains(realRoot, target)) throw new PathError('path escapes the vault')

  const real = await resolveThroughSymlinks(target)
  if (!contains(realRoot, real)) throw new PathError('path escapes the vault')
  return target
}

export function toVaultPath(root: string, absolute: string): VaultPath {
  return path.relative(root, absolute).split(path.sep).join('/')
}
