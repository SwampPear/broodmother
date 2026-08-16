import { readFile } from 'node:fs/promises'
import { DreamError, type DreamNode } from '@broodmother/shared'
import type { Tree } from '../../tree'
import { claudeBlock } from './claude'
import { museBlock } from './muse'
import { shellBlock } from './shell'
import { gateBlock } from './gate'
import { noteBlock } from './note'

/**
 * The block contract. A step is handed one file of context and owes one file back: the
 * engine writes `input` to `inputPath` before the block runs, and whatever the block
 * answers as `output` lands in `outputPath` after — the file is the only channel between
 * steps, everything else a block needs it finds in the checkout it runs in. A block that
 * runs a process passes the three paths on in `DREAM_INPUT`, `DREAM_OUTPUT` and
 * `DREAM_VERDICT`, so the process can write its own hand-off and its own decision.
 *
 * A new kind of block is one file beside these exporting a `(node, ctx) => StepResult`,
 * one case in `performStep`, a node type in `packages/shared/src/dream`, and an entry in
 * the web editor's `KINDS` — nothing else owes it anything.
 */
export interface StepCtx {
  /** The checkout the dream lives in — every step's working directory. */
  cwd: string
  /** Where `agent.note` writes: notes are a vault idea, wherever the dream lives. */
  vault: Tree | null
  /** What upstream produced — the contents of the step's input file. */
  input: string
  inputPath: string
  outputPath: string
  verdictPath: string
  /** Where the step's outgoing edges lead, by node name — the paths a verdict may pick. */
  routes: string[]
  env: Record<string, string>
  persona: string | null
  /** The standing brief every agent here gets — the vault, the projects, their paths —
   *  the same one the terminals hand theirs. */
  brief: string | null
}

export interface StepResult {
  output: string
  /** Routes to keep, of `ctx.routes`; empty ends every branch quietly; absent keeps all. */
  next?: string[]
  /** A deliberate halt and its reason: the step is 'stopped', the run still finishes. */
  stop?: string
}

export function performStep(node: DreamNode, ctx: StepCtx): Promise<StepResult> | null {
  switch (node.kind) {
    case 'agent.claude':
      return claudeBlock(node, ctx)
    case 'agent.muse':
      return museBlock(node, ctx)
    case 'agent.shell':
      return shellBlock(node, ctx)
    case 'agent.gate':
      return gateBlock(node, ctx)
    case 'agent.note':
      return noteBlock(node, ctx)
    default:
      return null
  }
}

/** The three paths a process block hands its process, named for the flow they serve. */
export function flowEnv(ctx: StepCtx): Record<string, string> {
  return {
    DREAM_INPUT: ctx.inputPath,
    DREAM_OUTPUT: ctx.outputPath,
    DREAM_VERDICT: ctx.verdictPath,
  }
}

/** What a process block ends on: the out-file it was asked to write, or failing that
 *  what it printed — and its verdict, where it left one. */
export async function finish(ctx: StepCtx, said: string): Promise<StepResult> {
  const output = await readFile(ctx.outputPath, 'utf8').catch(() => null)
  const verdict = await readFile(ctx.verdictPath, 'utf8').catch(() => null)
  return { output: output ?? said, ...(verdict === null ? {} : parseVerdict(verdict)) }
}

/** A verdict is small JSON with everything at stake, so a malformed one is a step error
 *  rather than a shrug — silently following every path is the one wrong default. */
export function parseVerdict(text: string): Pick<StepResult, 'next' | 'stop'> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new DreamError('the verdict is not JSON')
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
    throw new DreamError('a verdict is an object with "next" or "stop"')
  const { next, stop } = parsed as { next?: unknown; stop?: unknown }
  const verdict: Pick<StepResult, 'next' | 'stop'> = {}
  if (stop !== undefined) {
    if (typeof stop !== 'string')
      throw new DreamError('a verdict "stop" is the reason, a string')
    verdict.stop = stop
  }
  if (next !== undefined) {
    if (!Array.isArray(next) || next.some((one) => typeof one !== 'string'))
      throw new DreamError('a verdict "next" is a list of path names')
    verdict.next = next as string[]
  }
  return verdict
}
