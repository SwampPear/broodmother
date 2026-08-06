import { createHash } from 'node:crypto'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import type { DreamNode, FileTrigger, HttpTrigger } from '@/types'

/** What a trigger remembers between checks: a small JSON cursor — an mtime, an etag, a
 *  last-seen id — whatever the source hands out that says "seen up to here". */
export type TriggerState = Record<string, string | number>

export interface TriggerFiring {
  /** Becomes the trigger node's output, so the graph downstream can read what happened. */
  payload: string
}

export interface TriggerCheck {
  firings: TriggerFiring[]
  state: TriggerState
}

export interface TriggerTools {
  /** The folder the dream's checkout lives in, for sources named by relative path. */
  cwd: string
  fetch: typeof fetch
}

export type TriggerCheckFn = (
  state: TriggerState | null,
  tools: TriggerTools,
) => Promise<TriggerCheck>

/**
 * How an event trigger is written: read the source, compare it against the saved state,
 * answer with what fired and the state to save. The first check — state null — is the
 * baseline: record where the source stands, fire nothing. A new kind of trigger is one
 * such function and a case below, and the watcher owes it nothing else.
 */
export function eventCheck(node: DreamNode): TriggerCheckFn | null {
  switch (node.kind) {
    case 'trigger.file':
      return (state, tools) => checkFile(node, state, tools)
    case 'trigger.http':
      return (state, tools) => checkHttp(node, state, tools)
    default:
      return null
  }
}

async function checkFile(
  node: FileTrigger,
  state: TriggerState | null,
  tools: TriggerTools,
): Promise<TriggerCheck> {
  const target = path.isAbsolute(node.path) ? node.path : path.join(tools.cwd, node.path)
  // A missing file stands at 0, so appearing counts as a change the way editing does.
  const seen = await stat(target).then(
    (info) => info.mtimeMs,
    () => 0,
  )
  const fired = state !== null && seen !== state.mtime
  return { firings: fired ? [{ payload: target }] : [], state: { mtime: seen } }
}

async function checkHttp(
  node: HttpTrigger,
  state: TriggerState | null,
  tools: TriggerTools,
): Promise<TriggerCheck> {
  const response = await tools.fetch(node.url)
  if (!response.ok) throw new Error(`${node.url} answered ${response.status}`)
  const body = await response.text()
  const etag = response.headers.get('etag')
  const mark = etag ?? createHash('sha256').update(body).digest('hex')
  const fired = state !== null && mark !== state.mark
  return { firings: fired ? [{ payload: body }] : [], state: { mark } }
}
