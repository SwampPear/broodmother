import { mkdir, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import type { DreamNode } from '@/types'

/**
 * One folder per run, under the broodmother home: the files the steps handed each other,
 * kept after the run as its inspectable record and pruned with its row in the store.
 */
export function runScratch(base: string, runId: string): string {
  return path.join(base, runId)
}

export async function openScratch(base: string, runId: string): Promise<string> {
  const dir = runScratch(base, runId)
  await mkdir(dir, { recursive: true })
  return dir
}

export async function pruneScratch(base: string, runIds: string[]): Promise<void> {
  await Promise.all(
    runIds.map((id) => rm(runScratch(base, id), { recursive: true, force: true })),
  )
}

export interface StepFiles {
  opening: string
  input: string
  output: string
  verdict: string
}

/** A node id is a name the editor made, not a path — it stays one on disk. */
const safe = (id: string) => id.replace(/[^\w.-]/g, '_')

export function stepFiles(dir: string, id: string): StepFiles {
  const stem = path.join(dir, safe(id))
  return {
    opening: `${stem}.md`,
    input: `${stem}.in.md`,
    output: `${stem}.out.md`,
    verdict: `${stem}.verdict.json`,
  }
}

/**
 * What the trigger saw, rendered as the run's opening file. A manual run opens on
 * nothing; a file trigger names the file that moved and carries what it now says; every
 * other trigger's payload already is the context.
 */
export async function openingContext(
  node: DreamNode,
  payload: string | undefined,
): Promise<string> {
  if (payload === undefined) return ''
  if (node.kind === 'trigger.file' && payload) {
    const content = await readFile(payload, 'utf8').catch(() => null)
    return content === null ? payload : `${payload}\n\n${content}`
  }
  return payload
}

/** One file in, whatever fed it: a single feed passes through whole, and a join names
 *  each part after the node that said it. */
export function composeInput(feeds: { name: string; output: string }[]): string {
  const live = feeds.filter((one) => one.output)
  if (live.length <= 1) return live[0]?.output ?? ''
  return live.map((one) => `## from ${one.name}\n\n${one.output}`).join('\n\n')
}
