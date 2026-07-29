import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { livePreview } from '../live-preview'

const stateAt = (doc: string, cursor: number) =>
  EditorState.create({
    doc,
    selection: { anchor: cursor },
    extensions: [markdown({ base: markdownLanguage }), livePreview],
  })

/** Every range the decorations hide or replace, as `[from, to)` pairs. */
function replaced(doc: string, cursor: number) {
  const state = stateAt(doc, cursor)
  const set = state.field(livePreview)
  const out: [number, number][] = []
  const cursorIter = set.iter()
  while (cursorIter.value) {
    if (cursorIter.value.spec.widget || cursorIter.value.spec.class === undefined)
      out.push([cursorIter.from, cursorIter.to])
    cursorIter.next()
  }
  return out
}

const hides = (doc: string, cursor: number, from: number, to: number) =>
  replaced(doc, cursor).some(([a, b]) => a === from && b === to)

describe('live preview', () => {
  it('hides the heading marker when the cursor is off the line', () => {
    expect(hides('## Title\n\nbody', 12, 0, 3)).toBe(true)
  })

  it('shows the heading marker when the cursor is on the line', () => {
    expect(hides('## Title\n\nbody', 4, 0, 3)).toBe(false)
  })

  it('hides emphasis markers around the word', () => {
    expect(hides('a **bold** word', 14, 2, 4)).toBe(true)
    expect(hides('a **bold** word', 14, 8, 10)).toBe(true)
  })

  it('reveals emphasis markers when the selection is inside the word', () => {
    expect(hides('a **bold** word', 6, 2, 4)).toBe(false)
  })

  it('reveals at the boundary, not one character past it', () => {
    expect(hides('a **bold** word', 10, 2, 4)).toBe(false)
    expect(hides('a **bold** word', 11, 2, 4)).toBe(true)
  })

  it('replaces an equation the cursor is not in', () => {
    expect(hides('see $x^2$ here', 0, 4, 9)).toBe(true)
  })

  it('leaves an equation as source while the cursor is in it', () => {
    expect(hides('see $x^2$ here', 6, 4, 9)).toBe(false)
  })

  it('hides wikilink brackets', () => {
    expect(hides('go to [[Whitepaper]] now', 0, 6, 8)).toBe(true)
    expect(hides('go to [[Whitepaper]] now', 0, 18, 20)).toBe(true)
  })

  it('leaves a fenced code block untouched', () => {
    const doc = '```\n$not math$\n```'
    expect(replaced(doc, 0)).toEqual([])
  })
})
