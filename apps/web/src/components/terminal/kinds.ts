import { type IconName } from '../ui'

/**
 * Both are a plain login shell; the difference is what gets typed into it first. They live
 * here rather than beside the terminal itself because the tab strip offers them too, and a
 * strip that had to import the terminal would drag xterm in with it.
 */
export type TerminalKind = 'shell' | 'claude'

/**
 * What a tab types into its shell once the shell has spoken, or null where it types
 * nothing. The brief itself is the backend's — it describes the vault, the projects and
 * their paths, which is state the browser holds no copy of — and reaches the shell in its
 * environment. Double quotes because it arrives with its blank lines in it and still has
 * to be one argument.
 */
export function command(kind: TerminalKind): string | null {
  if (kind !== 'claude') return null
  return 'claude --dangerously-skip-permissions --append-system-prompt "$BROODMOTHER_BRIEF"\r'
}

export const TERMINALS: Record<
  TerminalKind,
  { icon: IconName; name: string; label: string }
> = {
  shell: { icon: 'terminal', name: 'terminal', label: 'shell' },
  claude: {
    icon: 'claude',
    name: 'claude',
    label: 'claude code (--dangerously-skip-permissions)',
  },
}

export const KINDS: TerminalKind[] = ['shell', 'claude']
