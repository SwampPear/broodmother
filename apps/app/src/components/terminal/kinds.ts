import { type IconName } from '../ui'

/**
 * Each is a plain login shell; the difference is what gets typed into it first. They live
 * here rather than beside the terminal itself because the tab strip offers them too, and a
 * strip that had to import the terminal would drag xterm in with it.
 */
export type TerminalKind = 'shell' | 'claude' | 'cursor' | 'opencode' | 'muse'

/**
 * What a tab types into its shell once the shell has spoken, or null where it types
 * nothing. The brief itself is the backend's — it describes the vault, the projects and
 * their paths, which is state the browser holds no copy of — and reaches the shell in its
 * environment. Double quotes because it arrives with its blank lines in it and still has
 * to be one argument.
 */
export function command(kind: TerminalKind): string | null {
  switch (kind) {
    case 'claude':
      return 'claude --dangerously-skip-permissions --append-system-prompt "$BROODMOTHER_BRIEF"\r'
    // cursor-agent has no system-prompt flag, so the brief opens the session as its first
    // message instead — the same telling, delivered the one way its CLI can hear it.
    case 'cursor':
      return 'cursor-agent --force "$BROODMOTHER_BRIEF"\r'
    case 'opencode':
      return 'opencode --auto\r'
    // Muse Spark has no CLI of its own: it rides opencode, through the meta provider the
    // user has configured in opencode.json.
    case 'muse':
      return 'opencode --auto --model meta/muse-spark-1.1\r'
    default:
      return null
  }
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
  cursor: { icon: 'cursor', name: 'cursor', label: 'cursor agent (--force)' },
  opencode: { icon: 'opencode', name: 'opencode', label: 'opencode (--auto)' },
  muse: {
    icon: 'muse',
    name: 'muse spark',
    label: 'muse spark 1.1 via opencode (--auto)',
  },
}

export const KINDS: TerminalKind[] = ['shell', 'claude', 'cursor', 'opencode', 'muse']
