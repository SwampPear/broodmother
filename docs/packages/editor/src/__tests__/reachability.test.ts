import { SCHEMA_SPEC } from '@docs/shared'
import type { Editor } from '@tiptap/core'
import { describe, expect, it } from 'vitest'
import { SlashMenu } from '../slash-menu'
import { docOf, headlessEditor, pressKey, typeText, typesIn } from './harness'

const reached = async (steps: Journey) => {
  const editor = headlessEditor([SlashMenu])
  await steps(editor)
  const types = typesIn(docOf(editor))
  editor.destroy()
  return [...types]
}

/** The suggestion plugin resolves its item list off the transaction. */
const slash = async (editor: Editor, query: string) => {
  typeText(editor, `/${query}`)
  await new Promise((resolve) => setTimeout(resolve))
  expect(pressKey(editor, { key: 'Enter' })).toBe(true)
}

const withSelectedText = (editor: Editor) => {
  typeText(editor, 'text')
  editor.commands.setTextSelection({ from: 1, to: 5 })
}

type Journey = (editor: Editor) => void | Promise<void>

/** One keyboard-only journey per spec member. `doc`, `paragraph` and `text` come free. */
const journeys: Record<string, Journey> = {
  typing: (editor) => typeText(editor, 'plain'),
  heading: (editor) => {
    for (const level of SCHEMA_SPEC.headingLevels) {
      pressKey(editor, { key: String(level), ctrlKey: true, altKey: true })
      typeText(editor, `h${level}`)
      pressKey(editor, { key: 'Enter' })
    }
  },
  bulletList: (editor) => {
    pressKey(editor, { key: '8', ctrlKey: true, shiftKey: true })
    typeText(editor, 'item')
  },
  orderedList: (editor) => {
    pressKey(editor, { key: '7', ctrlKey: true, shiftKey: true })
    typeText(editor, 'item')
  },
  taskList: (editor) => {
    pressKey(editor, { key: '9', ctrlKey: true, shiftKey: true })
    typeText(editor, 'task')
  },
  codeBlock: (editor) => {
    pressKey(editor, { key: 'c', ctrlKey: true, altKey: true })
  },
  blockquote: (editor) => {
    pressKey(editor, { key: 'b', ctrlKey: true, shiftKey: true })
  },
  math: (editor) => typeText(editor, 'at $x^2$ here'),
  mathBlock: (editor) => typeText(editor, '$$E = mc^2$$'),
  table: (editor) => slash(editor, 'table'),
  horizontalRule: (editor) => typeText(editor, '---'),
  image: (editor) => typeText(editor, '![alt](img.png)'),
  bold: (editor) => {
    withSelectedText(editor)
    pressKey(editor, { key: 'b', ctrlKey: true })
  },
  italic: (editor) => {
    withSelectedText(editor)
    pressKey(editor, { key: 'i', ctrlKey: true })
  },
  code: (editor) => {
    withSelectedText(editor)
    pressKey(editor, { key: 'e', ctrlKey: true })
  },
  strike: (editor) => {
    withSelectedText(editor)
    pressKey(editor, { key: 's', ctrlKey: true, shiftKey: true })
  },
  link: (editor) => typeText(editor, '[t](https://x.test) '),
  wikiLink: (editor) => typeText(editor, '[[Page]]'),
}

describe('keyboard reachability', () => {
  it.each(Object.keys(journeys))('%s is reachable', async (name) => {
    if (name !== 'typing') expect(await reached(journeys[name])).toContain(name)
  })

  it('covers every node and mark in the spec', async () => {
    const runs = await Promise.all(Object.values(journeys).map(reached))
    const covered = new Set(runs.flat())
    expect(
      [...SCHEMA_SPEC.nodes, ...SCHEMA_SPEC.marks].filter((t) => !covered.has(t)),
    ).toEqual([])
  })

  it.each([
    ['divider', 'horizontalRule'],
    ['image', 'image'],
    ['quote', 'blockquote'],
  ])('the slash item %s inserts a %s', async (query, type) => {
    expect(await reached((editor) => slash(editor, query))).toContain(type)
  })
})
