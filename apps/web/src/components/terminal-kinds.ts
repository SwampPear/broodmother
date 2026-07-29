import type { IconName } from './icons'

/**
 * Both are a plain login shell; the difference is what gets typed into it first. They live
 * here rather than beside the terminal itself because the tab strip offers them too, and a
 * strip that had to import the terminal would drag xterm in with it.
 */
export type TerminalKind = 'shell' | 'claude'

/**
 * What claude is told about the room it wakes up in. Without it a shell in a vault looks
 * like any other folder of markdown, and the one thing worth knowing — that a file it edits
 * is open in front of someone — is exactly what it cannot see from the filesystem. Kept to a
 * few lines, and free of quotes and $ so it survives the shell as a single argument.
 */
const BRIEF =
  'You are running in a terminal inside broodmother, a documentation app: a desktop app ' +
  'that edits a git repo of markdown as a vault of linked notes. The working directory ' +
  'is a broodmother project and each folder in it is a vault, a ' +
  'clone of a docs repo. The .md files on disk are the source of truth and git is the ' +
  'history, so edit the files directly rather than reaching for a database or an API. ' +
  'Someone may have the same file open in the browser editor while you work: it follows ' +
  'the file on disk, so prefer small edits over rewriting a document out from under them.'

export const TERMINALS: Record<
  TerminalKind,
  { icon: IconName; name: string; label: string; run: string | null }
> = {
  shell: { icon: 'terminal', name: 'terminal', label: 'shell', run: null },
  claude: {
    icon: 'claude',
    name: 'claude',
    label: 'claude code (--dangerously-skip-permissions)',
    run: `claude --dangerously-skip-permissions --append-system-prompt "${BRIEF}"\r`,
  },
}

export const KINDS: TerminalKind[] = ['shell', 'claude']
