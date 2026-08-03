import { execa } from 'execa'
import type { ClaudeNode } from '@broodmother/shared'
import { ambient } from '../../sockets'
import { finish, flowEnv, type StepCtx, type StepResult } from './core'
import { timeoutOf } from './shell'

/**
 * One Claude Code errand: the node's prompt as the ask, the flow protocol appended, run
 * from the checkout the dream lives in. The session env is scrubbed the same way the
 * terminals scrub it, or a server started from inside a claude session would hand every
 * dream a parent it never had.
 */
export async function claudeBlock(node: ClaudeNode, ctx: StepCtx): Promise<StepResult> {
  const args = ['-p', `${node.prompt}\n\n${protocol(ctx)}`]
  if (ctx.persona) args.push('--append-system-prompt', ctx.persona)
  const result = await execa('claude', args, {
    cwd: ctx.cwd,
    input: ctx.input,
    env: { ...ambient(), ...ctx.env, ...flowEnv(ctx) },
    extendEnv: false,
    timeout: timeoutOf(node),
    reject: false,
    stripFinalNewline: false,
  })
  if (result.failed || result.exitCode !== 0)
    throw new Error(result.stderr?.trim() || result.shortMessage || 'claude failed')
  return finish(ctx, result.stdout ?? '')
}

/** The flow's side of the prompt: where the context is, where the hand-off goes, and —
 *  only where there is a real choice — how to pick a path or stop the run. */
function protocol(ctx: StepCtx): string {
  const lines = [
    'You are one step of an automated flow.',
    'Your input context is the file at $DREAM_INPUT.',
    'Write the context the next step will need to the file at $DREAM_OUTPUT.',
  ]
  if (ctx.routes.length > 1)
    lines.push(
      `This step has ${ctx.routes.length} paths onward: ${ctx.routes
        .map((route) => `"${route}"`)
        .join(', ')}. To follow only some of them, write {"next": ["<path name>", ...]}` +
        ' to the file at $DREAM_VERDICT.',
    )
  lines.push(
    'To stop the flow deliberately, write {"stop": "<reason>"} to the file at' +
      ' $DREAM_VERDICT.',
  )
  return lines.join('\n')
}
