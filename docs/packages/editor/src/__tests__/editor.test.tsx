import type { DocNode } from '@docs/shared'
import type { Editor as Tiptap } from '@tiptap/core'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Editor } from '../editor'
import { pressKey, typeText } from './harness'

afterEach(cleanup)

const paragraph = (text: string): DocNode => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
})

/** Tiptap hangs its instance off the editable element; that is the only handle React gives us. */
const mounted = async () => {
  const [element] = await screen.findAllByRole('textbox')
  return (element as HTMLElement & { editor: Tiptap }).editor
}

describe('<Editor>', () => {
  it('renders the value it is given', async () => {
    render(<Editor value={paragraph('hello')} onChange={() => {}} />)
    expect(await screen.findByText('hello')).toBeDefined()
  })

  it('reports edits as doc nodes', async () => {
    const onChange = vi.fn()
    render(<Editor value={paragraph('hello')} onChange={onChange} />)
    const editor = await mounted()

    act(() => void editor.commands.keyboardShortcut('Mod-Shift-8'))

    const doc = onChange.mock.lastCall?.[0] as DocNode
    expect(doc.type).toBe('doc')
    expect(doc.content?.[0].type).toBe('bulletList')
  })

  it('replaces content when the value changes, frontmatter included', async () => {
    const next: DocNode = {
      ...paragraph('second'),
      attrs: { frontmatter: '---\na: 1\n---' },
    }
    const onChange = vi.fn()
    const { rerender } = render(<Editor value={paragraph('first')} onChange={onChange} />)
    await screen.findByText('first')

    rerender(<Editor value={next} onChange={onChange} />)
    await screen.findByText('second')
    expect(onChange).not.toHaveBeenCalled()

    const editor = await mounted()
    act(() => void editor.commands.keyboardShortcut('Mod-Shift-8'))
    expect((onChange.mock.lastCall?.[0] as DocNode).attrs).toEqual({
      frontmatter: '---\na: 1\n---',
    })
  })

  it('drives the slash menu from the keyboard', async () => {
    render(
      <Editor
        value={{ type: 'doc', content: [{ type: 'paragraph' }] }}
        onChange={() => {}}
      />,
    )
    const editor = await mounted()

    await act(async () => {
      typeText(editor, '/head')
      await new Promise((resolve) => setTimeout(resolve))
    })
    const options = await screen.findAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual([
      'Heading 1',
      'Heading 2',
      'Heading 3',
      'Heading 4',
    ])
    expect(options[0].ariaSelected).toBe('true')

    act(() => void pressKey(editor, { key: 'ArrowDown' }))
    await waitFor(() =>
      expect(screen.getByRole('option', { name: 'Heading 2' }).ariaSelected).toBe('true'),
    )

    act(() => void pressKey(editor, { key: 'Enter' }))
    await waitFor(() => expect(screen.queryByRole('option')).toBeNull())
    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: 'heading',
      attrs: { level: 2 },
    })
  })

  it('renders a drag handle for reordering', async () => {
    render(<Editor value={paragraph('hello')} onChange={() => {}} />)
    await screen.findByText('hello')
    await waitFor(() => expect(document.querySelector('.drag-handle')).not.toBeNull())
  })
})
