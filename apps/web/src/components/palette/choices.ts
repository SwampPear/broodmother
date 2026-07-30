import { basename, type VaultPath } from '@broodmother/shared'
import { displayName, fileTag, iconFor, type IconName } from '../ui'
import { deleteFlow, type Flow, type FlowCtx, moveFlow } from './flows'

export interface Choice {
  key: string
  icon: IconName
  /** What fuzzy matching sees, and the accessible name of the row. */
  text: string
  name: string
  /** The folder a document sits in. Commands have none. */
  note?: string
  tag?: string
  run: () => Flow | null
}

function commands(ctx: FlowCtx): Choice[] {
  function pick(label: string, next: (path: VaultPath) => Flow | null): Flow {
    return { kind: 'pick', label, next }
  }
  function done(perform: () => void): Flow | null {
    perform()
    return null
  }
  function command(text: string, icon: IconName, run: () => Flow | null): Choice {
    return { key: `command:${text}`, icon, text, name: text, run }
  }
  return [
    command('New note', 'plus', () => done(() => ctx.newNote())),
    command('Move or rename document', 'file-text', () =>
      pick('Move', (path) => moveFlow(ctx, path)),
    ),
    command('Delete document', 'x', () =>
      pick('Delete', (path) => deleteFlow(ctx, path)),
    ),
    command('Toggle terminal', 'terminal', () => done(() => ctx.toggleTerminal())),
    command('Sync now', 'chevrons-up-down', () => done(() => ctx.syncNow())),
    command('Switch or create vault', 'layout-dashboard', () => done(() => ctx.vaults())),
    command('Settings', 'settings', () => done(() => ctx.settings())),
  ]
}

// Matched on the whole path, so typing a folder narrows the search the way a name does.
function documentChoice(path: VaultPath, run: () => Flow | null): Choice {
  const cut = path.lastIndexOf('/')
  const base = basename(path)
  return {
    key: `doc:${path}`,
    icon: iconFor(path),
    text: path,
    name: displayName(base),
    note: cut < 0 ? undefined : path.slice(0, cut),
    tag: fileTag(base) ?? undefined,
    run,
  }
}

/** The top level searches commands and documents together; a picker searches documents only. */
export function choices(flow: Flow, ctx: FlowCtx): Choice[] {
  function docs(run: (path: VaultPath) => Flow | null) {
    return ctx.paths.map((path) => documentChoice(path, () => run(path)))
  }
  if (flow.kind === 'pick') return docs((path) => flow.next(path))
  if (flow.kind !== 'search') return []
  return [
    ...commands(ctx),
    ...docs((path) => {
      ctx.open(path)
      return null
    }),
  ]
}
