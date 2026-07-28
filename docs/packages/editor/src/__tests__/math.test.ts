import type { DocNode } from '@docs/shared'
import { describe, expect, it } from 'vitest'
import { docOf, headlessEditor, pasteHTML, typeText } from './harness'

const typed = (text: string) => {
  const editor = headlessEditor()
  typeText(editor, text)
  return editor
}

const block = (doc: DocNode) => doc.content?.[0]
const inline = (doc: DocNode) => block(doc)?.content?.[0]

const latex = String.raw`\log\!\left(|Z|_{\text{event}}\right)`

describe('math', () => {
  it('takes `$…$` inline', () => {
    expect(inline(docOf(typed('$x^2$')))).toEqual({
      type: 'math',
      content: [{ type: 'text', text: 'x^2' }],
    })
  })

  it('takes `$$…$$` as a block of its own', () => {
    expect(block(docOf(typed('$$E = mc^2$$')))).toEqual({
      type: 'mathBlock',
      content: [{ type: 'text', text: 'E = mc^2' }],
    })
  })

  it.each([
    ['math', `$${latex}$`, inline],
    ['mathBlock', `$$${latex}$$`, block],
  ])('keeps latex the markdown parser would mangle verbatim in %s', (_, typing, read) => {
    expect(read(docOf(typed(typing)))?.content).toEqual([{ type: 'text', text: latex }])
  })

  it.each([
    ['math', '$x$', inline, 2],
    ['mathBlock', '$$x$$', block, 1],
  ])('runs no input rules inside %s', (_, typing, read, start) => {
    const editor = typed(typing)
    editor.commands.setTextSelection(start)
    typeText(editor, ' **b** _i_ # ')
    expect(read(docOf(editor))?.content).toEqual([
      { type: 'text', text: ' **b** _i_ # x' },
    ])
  })

  it.each([
    ['math', '$x^2$', inline, 2],
    ['mathBlock', '$$x^2$$', block, 1],
  ])('takes no marks in %s', (_, typing, read, start) => {
    const editor = typed(typing)
    editor.commands.setTextSelection({ from: start, to: start + 3 })
    editor.commands.toggleBold()
    editor.commands.toggleMark('code')
    expect(read(docOf(editor))?.content).toEqual([{ type: 'text', text: 'x^2' }])
  })

  it('survives a round trip through html', () => {
    const editor = headlessEditor()
    pasteHTML(
      editor,
      '<p>see <span data-math>a &lt; b</span> here</p><div data-math-block>a &lt; b</div>',
    )
    const doc = docOf(editor)
    expect(doc.content?.[0].content?.[1]).toEqual({
      type: 'math',
      content: [{ type: 'text', text: 'a < b' }],
    })
    expect(doc.content?.[1]).toEqual({
      type: 'mathBlock',
      content: [{ type: 'text', text: 'a < b' }],
    })
  })
})
