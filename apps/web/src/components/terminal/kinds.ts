import { type IconName } from '../ui'

/**
 * Both are a plain login shell; the difference is what gets typed into it first. They live
 * here rather than beside the terminal itself because the tab strip offers them too, and a
 * strip that had to import the terminal would drag xterm in with it.
 */
export type TerminalKind = 'shell' | 'claude'

/**
 * What claude is told about the room it wakes up in. Without it a shell in a project
 * looks like any other folder of markdown, and the one thing worth knowing — that a file
 * it edits is open in front of someone — is exactly what it cannot see from the
 * filesystem. Kept to a few lines.
 */
const BRIEF =
  'You are running in a terminal inside broodmother, a documentation app: a desktop ' +
  'app that edits a git repo of markdown as a project of linked notes. The working ' +
  'directory is a checkout of a docs repo, one of the folders a broodmother project ' +
  'holds. The .md files on disk are the source of truth and git is the history, so ' +
  'edit the files directly rather than reaching for a database or an API. Someone may ' +
  'have the same file open in the browser editor while you work: it follows the file ' +
  'on disk, so prefer small edits over rewriting a document out from under them.'

/** The soul is markdown somebody typed, so it arrives with quotes, dollars and newlines in
 *  it. Single quotes hold all three, and `'\''` is how a shell is handed one of its own. */
function quoted(text: string): string {
  return `'${text.replace(/\s+/g, ' ').replace(/'/g, "'\\''")}'`
}

/**
 * What a tab types into its shell once the shell has spoken, or null where it types
 * nothing. The profile's soul rides in on the same prompt as the brief: where claude is
 * working, then who it is working as.
 */
export function command(kind: TerminalKind, soul: string | null): string | null {
  if (kind !== 'claude') return null
  const written = soul?.trim()
  const prompt = written
    ? `${BRIEF} Who you are, in the words of the person you are working with: ${written}`
    : BRIEF
  return `claude --dangerously-skip-permissions --append-system-prompt ${quoted(prompt)}\r`
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
