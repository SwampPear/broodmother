import { mkdir, readFile, readdir, rename, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import type { VaultEntry, VaultPath } from '@mother/shared'
import { atomicWrite } from './atomic'
import { Git } from './git'
import { PathError, normalize, resolveInVault } from './paths'

export class Vault {
  private readonly git: Git

  constructor(readonly root: string) {
    this.git = new Git(root)
  }

  resolve(input: string): Promise<string> {
    return resolveInVault(this.root, input)
  }

  async list(): Promise<VaultEntry[]> {
    const ignored = await this.git.ignored()
    return this.walk('', ignored)
  }

  private async walk(prefix: VaultPath, ignored: Set<string>): Promise<VaultEntry[]> {
    const dir = prefix ? path.join(this.root, prefix) : this.root
    const dirents = await readdir(dir, { withFileTypes: true })
    const entries: VaultEntry[] = []

    for (const dirent of dirents) {
      if (dirent.name.startsWith('.')) continue
      const vaultPath = prefix ? `${prefix}/${dirent.name}` : dirent.name
      if (ignored.has(vaultPath)) continue

      if (dirent.isDirectory()) {
        entries.push({
          kind: 'dir',
          path: vaultPath,
          name: dirent.name,
          children: await this.walk(vaultPath, ignored),
        })
      } else if (dirent.isFile()) {
        const stats = await stat(path.join(dir, dirent.name))
        entries.push({
          kind: 'file',
          path: vaultPath,
          name: dirent.name,
          size: stats.size,
          modifiedAt: stats.mtimeMs,
        })
      }
    }

    entries.sort((a, b) =>
      a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'dir' ? -1 : 1,
    )
    return entries
  }

  /** Every `.md` file in the vault, for the link index. */
  async documents(): Promise<VaultPath[]> {
    const found: VaultPath[] = []
    const collect = (entries: VaultEntry[]) => {
      for (const entry of entries) {
        if (entry.kind === 'dir') collect(entry.children)
        else if (entry.path.endsWith('.md')) found.push(entry.path)
      }
    }
    collect(await this.list())
    return found
  }

  async exists(input: string): Promise<boolean> {
    return exists(await this.resolve(input))
  }

  async read(input: string): Promise<string> {
    return readFile(await this.resolve(input), 'utf8')
  }

  async write(input: string, contents: string): Promise<VaultPath> {
    const vaultPath = normalize(input)
    await atomicWrite(await this.resolve(vaultPath), contents)
    return vaultPath
  }

  async move(
    fromInput: string,
    toInput: string,
  ): Promise<{ from: VaultPath; to: VaultPath }> {
    const from = normalize(fromInput)
    const to = normalize(toInput)
    const fromAbsolute = await this.resolve(from)
    const toAbsolute = await this.resolve(to)
    if (await exists(toAbsolute)) throw new PathError(`${to} already exists`)
    await mkdir(path.dirname(toAbsolute), { recursive: true })
    await rename(fromAbsolute, toAbsolute)
    return { from, to }
  }

  async remove(input: string): Promise<VaultPath> {
    const vaultPath = normalize(input)
    await rm(await this.resolve(vaultPath), { recursive: true, force: false })
    return vaultPath
  }
}

async function exists(absolute: string): Promise<boolean> {
  try {
    await stat(absolute)
    return true
  } catch {
    return false
  }
}
