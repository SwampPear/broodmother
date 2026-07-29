import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DocNode } from '@mother/shared'
import { describe, expect, it } from 'vitest'
import { parse, serialize } from './index'

const dir = fileURLToPath(new URL('../fixtures', import.meta.url))
const files = readdirSync(dir).filter((name) => name.endsWith('.md'))
const read = (name: string) => readFileSync(join(dir, name), 'utf8')

/**
 * Real vault files, copied verbatim. Most are byte-identical through the codec; the rest
 * differ only where the file was never in normalized form to begin with — see
 * CONTRACT-REQUEST.md for the cases where that is a schema gap rather than a reformat.
 */
describe('vault corpus', () => {
  it('has the whole vault', () => expect(files.length).toBe(89))

  it.each(files)('%s round-trips without loss', (name) => {
    const source = read(name)
    expect(parse(serialize(parse(source)))).toEqual(parse(source))
  })

  it.each(files)('%s serializes to a fixed point', (name) => {
    const once = serialize(parse(read(name)))
    expect(serialize(parse(once))).toBe(once)
  })

  it('leaves already-normalized files byte-identical', () => {
    const changed = files.filter((name) => serialize(parse(read(name))) !== read(name))
    expect(files.length - changed.length).toBeGreaterThanOrEqual(33)
  })

  /**
   * The round-trip tests above would still pass if math stopped being recognised — both
   * sides would mangle the LaTeX the same way. Only the node count catches that.
   */
  it('reads the vault LaTeX as math and not as prose', () => {
    const math = files.flatMap((name) => mathNodes(parse(read(name))))
    expect(math.length).toBeGreaterThanOrEqual(276)
    expect(
      math.filter((node) => node.type === 'mathBlock').length,
    ).toBeGreaterThanOrEqual(12)
  })
})

function mathNodes(node: DocNode, found: DocNode[] = []): DocNode[] {
  if (node.type === 'math' || node.type === 'mathBlock') found.push(node)
  for (const child of node.content ?? []) mathNodes(child, found)
  return found
}
