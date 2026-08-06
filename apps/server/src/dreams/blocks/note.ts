import { DreamError } from '@/dream'
import type { NoteNode } from '@/types'
import type { StepCtx, StepResult } from './core'

/** Writes what fed it into the vault, and passes the same context onward untouched. */
export async function noteBlock(node: NoteNode, ctx: StepCtx): Promise<StepResult> {
  if (!ctx.vault) throw new DreamError('no vault to write the note into')
  const body = ctx.input ? `${ctx.input}\n` : ''
  const had = node.append ? await ctx.vault.read(node.path).catch(() => '') : ''
  await ctx.vault.write(node.path, `${had}${body}`)
  return { output: ctx.input }
}
