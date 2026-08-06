import type { DocRoot } from '@/types'

export function projectRoot(name: string): DocRoot {
  return `project:${name}`
}

// The project a root names, or null when it names the vault.
export function projectOf(root: DocRoot): string | null {
  return root === 'vault' ? null : root.slice('project:'.length)
}
