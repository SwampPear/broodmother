import { realpath } from 'node:fs/promises'
import path from 'node:path'
import type { DocPath } from '@broodmother/shared'

export class PathError extends Error {}

/** The names broodmother keeps for itself. Everything else starting with a dot is a
 *  document like any other — hidden from Finder, not from the app that edits it. */
export const RESERVED = new Set(['.git', '.broodmother', '.projects'])

export function normalize(input: string): DocPath {
  if (typeof input !== 'string' || input.length === 0) throw new PathError('empty path')
  if (input.includes('\0')) throw new PathError('path contains a null byte')
  if (input.includes('\\')) throw new PathError('path contains a backslash')
  if (path.isAbsolute(input) || /^[a-zA-Z]:/.test(input))
    throw new PathError('path must be relative to the tree root')

  const segments = input.split('/')
  for (const segment of segments) {
    if (segment === '' || segment === '.' || segment === '..')
      throw new PathError(`path segment not allowed: "${segment}"`)
    if (RESERVED.has(segment))
      throw new PathError(`path segment not allowed: "${segment}"`)
  }
  return segments.join('/')
}

/**
 * A vault is a folder, a project is a name for one, a profile is a file — every name typed
 * into broodmother becomes one of those. Returns the complaint to put after the noun, or
 * null if the name is fine.
 */
export function nameProblem(name: string): string | null {
  if (name !== name.trim() || name.length === 0)
    return 'must not be blank or padded with spaces'
  if (name.startsWith('.')) return 'must not start with a dot — it would be hidden'
  if (/[/\\]/.test(name) || name.includes('\0'))
    return 'must be a plain folder name, not a path'
  return null
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
 * The only place a tree's boundary exists: paths arrive from a browser, so escapes are
 * rejected after symlink resolution rather than by inspecting the string alone.
 */
export async function resolveInRoot(root: string, input: string): Promise<string> {
  const rel = normalize(input)
  const realRoot = await realpath(root)
  const target = path.resolve(realRoot, rel)
  if (!contains(realRoot, target)) throw new PathError('path escapes the root')

  const real = await resolveThroughSymlinks(target)
  if (!contains(realRoot, real)) throw new PathError('path escapes the root')
  return target
}

export function toDocPath(root: string, absolute: string): DocPath {
  return path.relative(root, absolute).split(path.sep).join('/')
}
