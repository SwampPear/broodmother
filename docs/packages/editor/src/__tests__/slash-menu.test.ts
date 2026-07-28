import { describe, expect, it } from 'vitest'
import { SLASH_ITEMS, SlashMenu, type SlashState } from '../slash-menu'
import { docOf, headlessEditor, pressKey, typeText, typesIn } from './harness'

const open = async (query: string, before?: string) => {
  const seen: { state: SlashState | null } = { state: null }
  const editor = headlessEditor([
    SlashMenu.configure({
      onChange: (state) => {
        seen.state = state
      },
    }),
  ])
  if (before) typeText(editor, before)
  typeText(editor, `/${query}`)
  await new Promise((resolve) => setTimeout(resolve))
  return { editor, seen }
}

describe('slash menu', () => {
  it('opens on / in an empty block with every item', async () => {
    const { seen } = await open('')
    expect(seen.state?.items).toEqual(SLASH_ITEMS)
    expect(seen.state?.index).toBe(0)
  })

  it('filters on the query', async () => {
    const { seen } = await open('head')
    expect(seen.state?.items.map((item) => item.title)).toEqual([
      'Heading 1',
      'Heading 2',
      'Heading 3',
      'Heading 4',
    ])
  })

  it('stays shut mid-paragraph and inside a code block', async () => {
    expect((await open('', 'note ')).seen.state).toBeNull()
    expect((await open('', '``` ')).seen.state).toBeNull()
  })

  it('moves the selection with the arrows and wraps', async () => {
    const { editor, seen } = await open('')
    const last = SLASH_ITEMS.length - 1
    expect(pressKey(editor, { key: 'ArrowDown' })).toBe(true)
    expect(seen.state?.index).toBe(1)
    expect(pressKey(editor, { key: 'ArrowUp' })).toBe(true)
    expect(seen.state?.index).toBe(0)
    pressKey(editor, { key: 'ArrowUp' })
    expect(seen.state?.index).toBe(last)
    pressKey(editor, { key: 'ArrowDown' })
    expect(seen.state?.index).toBe(0)
  })

  it('runs the selected item on enter and closes', async () => {
    const { editor, seen } = await open('')
    pressKey(editor, { key: 'ArrowDown' })
    expect(seen.state?.items[seen.state.index].title).toBe('Heading 1')
    expect(pressKey(editor, { key: 'Enter' })).toBe(true)
    expect([...typesIn(docOf(editor))]).toContain('heading')
    expect(seen.state).toBeNull()
  })

  it('closes on escape and leaves the text alone', async () => {
    const { editor, seen } = await open('quo')
    expect(pressKey(editor, { key: 'Escape' })).toBe(true)
    expect(seen.state).toBeNull()
    expect(editor.state.doc.textContent).toBe('/quo')
  })
})
