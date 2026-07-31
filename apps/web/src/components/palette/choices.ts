import { basename, projectOf, type DocRef } from '@broodmother/shared'
import { displayName, fileTag, iconFor, type IconName } from '../ui'
import { deleteFlow, type Flow, type FlowCtx, moveFlow } from './flows'

export interface Choice {
  key: string
  icon: IconName
  /** What fuzzy matching sees, and the accessible name of the row. */
  text: string
  name: string
  /** The folder a document sits in, with `project` in front of it when it is one of the
   *  project's. Commands have none. */
  note?: string
  tag?: string
  run: () => Flow | null
}

function commands(ctx: FlowCtx): Choice[] {
  function pick(label: string, next: (ref: DocRef) => Flow | null): Flow {
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
      pick('Move', (ref) => moveFlow(ctx, ref)),
    ),
    command('Delete document', 'x', () => pick('Delete', (ref) => deleteFlow(ctx, ref))),
    command('Toggle terminal', 'terminal', () => done(() => ctx.toggleTerminal())),
    command('Sync now', 'chevrons-up-down', () => done(() => ctx.syncNow())),
    command('Switch project', 'folder', () => done(() => ctx.projects())),
    command('New project', 'plus', () => done(() => ctx.createProject())),
    command('Switch or create vault', 'layout-dashboard', () => done(() => ctx.vaults())),
    command('Settings', 'settings', () => done(() => ctx.settings())),
  ]
}

// Matched on the whole path, so typing a folder narrows the search the way a name does —
// and on the tree it sits in, so typing a project's name narrows it to that project's files.
function documentChoice(ref: DocRef, run: () => Flow | null): Choice {
  const cut = ref.path.lastIndexOf('/')
  const base = basename(ref.path)
  const folder = cut < 0 ? '' : ref.path.slice(0, cut)
  const prefix = projectOf(ref.root) ?? ''
  return {
    key: `${ref.root}:${ref.path}`,
    icon: iconFor(ref.path),
    text: prefix ? `${prefix}/${ref.path}` : ref.path,
    name: displayName(base),
    note: [prefix, folder].filter(Boolean).join('/') || undefined,
    tag: fileTag(base) ?? undefined,
    run,
  }
}

/** The top level searches commands and documents together; a picker searches documents only. */
export function choices(flow: Flow, ctx: FlowCtx): Choice[] {
  function docs(run: (ref: DocRef) => Flow | null) {
    return ctx.refs.map((ref) => documentChoice(ref, () => run(ref)))
  }
  if (flow.kind === 'pick') return docs((ref) => flow.next(ref))
  if (flow.kind !== 'search') return []
  return [
    ...commands(ctx),
    ...docs((ref) => {
      ctx.open(ref)
      return null
    }),
  ]
}
