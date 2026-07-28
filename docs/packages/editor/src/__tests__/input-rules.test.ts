import type { DocNode } from '@docs/shared'
import { describe, expect, it } from 'vitest'
import { docOf, headlessEditor, typeText } from './harness'

const typed = (text: string): DocNode => {
  const editor = headlessEditor()
  typeText(editor, text)
  const doc = docOf(editor)
  editor.destroy()
  return doc
}

const firstBlock = (text: string) => typed(text).content?.[0] as DocNode
const firstMark = (text: string) => (firstBlock(text).content?.[0].marks ?? [])[0]

describe('input rules', () => {
  it.each([
    ['# ', { type: 'heading', attrs: { level: 1 } }],
    ['#### ', { type: 'heading', attrs: { level: 4 } }],
    ['- ', { type: 'bulletList' }],
    ['1. ', { type: 'orderedList', attrs: { start: 1 } }],
    ['> ', { type: 'blockquote' }],
    ['``` ', { type: 'codeBlock', attrs: { language: null } }],
    ['---', { type: 'horizontalRule' }],
  ])('%s opens a %o block', (text, expected) => {
    expect(firstBlock(text)).toMatchObject(expected)
  })

  it('turns `- [ ] ` and `- [x] ` into task items', () => {
    expect(firstBlock('- [ ] ')).toMatchObject({
      type: 'taskList',
      content: [{ type: 'taskItem', attrs: { checked: false } }],
    })
    expect(firstBlock('- [x] ')).toMatchObject({
      type: 'taskList',
      content: [{ type: 'taskItem', attrs: { checked: true } }],
    })
  })

  it('keeps text typed after the task marker', () => {
    expect(firstBlock('- [ ] milk')).toMatchObject({
      content: [{ content: [{ content: [{ type: 'text', text: 'milk' }] }] }],
    })
  })

  it.each([
    ['**b**', 'bold'],
    ['*i*', 'italic'],
    ['`c`', 'code'],
    ['~~s~~', 'strike'],
  ])('%s applies the %s mark', (text, mark) => {
    expect(firstMark(text)).toEqual({ type: mark })
  })

  it('applies a link from markdown syntax', () => {
    expect(firstMark('[t](https://x.test) ')).toEqual({
      type: 'link',
      attrs: { href: 'https://x.test', title: null },
    })
  })

  it.each([
    ['[[Page]]', 'Page', { target: 'Page', alias: null }],
    ['[[Page|alias]]', 'alias', { target: 'Page', alias: 'alias' }],
  ])('%s becomes a wikilink showing %s', (text, shown, attrs) => {
    const [node] = firstBlock(text).content ?? []
    expect(node.text).toBe(shown)
    expect(node.marks).toEqual([{ type: 'wikiLink', attrs }])
  })

  it('does not extend a wikilink into the text after it', () => {
    const [, next] = firstBlock('[[Page]] and more').content ?? []
    expect(next.marks).toBeUndefined()
  })

  it('inserts an image from markdown syntax', () => {
    expect(typed('![alt](img.png)').content).toContainEqual({
      type: 'image',
      attrs: { src: 'img.png', alt: 'alt', title: null },
    })
  })
})
