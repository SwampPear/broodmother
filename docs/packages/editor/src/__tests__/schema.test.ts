import { SCHEMA_SPEC } from '@docs/shared'
import { afterEach, describe, expect, it } from 'vitest'
import { docOf, headlessEditor, pasteHTML, typesIn, walk } from './harness'

const editor = headlessEditor()
afterEach(() => editor.commands.setContent('<p></p>'))

const attrsOf = (name: string) =>
  Object.keys((editor.schema.nodes[name] ?? editor.schema.marks[name]).spec.attrs ?? {})

describe('schema', () => {
  it('registers exactly the spec nodes and marks', () => {
    expect(new Set(Object.keys(editor.schema.nodes))).toEqual(new Set(SCHEMA_SPEC.nodes))
    expect(new Set(Object.keys(editor.schema.marks))).toEqual(new Set(SCHEMA_SPEC.marks))
  })

  it('ranks marks in the shared nesting order, outermost first', () => {
    expect(Object.keys(editor.schema.marks)).toEqual([...SCHEMA_SPEC.marks])
  })

  it('carries exactly the shared attributes', () => {
    expect(attrsOf('doc')).toEqual(['frontmatter'])
    expect(attrsOf('heading')).toEqual(['level'])
    expect(attrsOf('orderedList')).toEqual(['start'])
    expect(attrsOf('taskItem')).toEqual(['checked'])
    expect(attrsOf('codeBlock')).toEqual(['language'])
    expect(attrsOf('image')).toEqual(['src', 'alt', 'title'])
    expect(attrsOf('tableCell')).toEqual(['colspan', 'rowspan'])
    expect(attrsOf('tableHeader')).toEqual(['colspan', 'rowspan'])
    expect(attrsOf('link')).toEqual(['href', 'title'])
    expect(attrsOf('wikiLink')).toEqual(['target', 'alias'])
    for (const name of [
      'paragraph',
      'text',
      'bulletList',
      'listItem',
      'taskList',
      'blockquote',
      'math',
      'mathBlock',
    ])
      expect(attrsOf(name)).toEqual([])
  })

  it('offers only the spec heading levels', () => {
    for (const level of SCHEMA_SPEC.headingLevels)
      expect(editor.commands.keyboardShortcut(`Mod-Alt-${level}`)).toBe(true)
    expect(editor.can().setHeading({ level: 5 })).toBe(false)
  })

  it('degrades rich html paste to spec nodes and attributes', () => {
    pasteHTML(
      editor,
      `<h5>demoted</h5>
       <p><u>u</u><sup>s</sup><span style="color:red">c</span><b>b</b></p>
       <a href="https://x.test" target="_blank" rel="noopener" title="T">l</a>
       <img src="a.png" width="10" height="3" alt="a">
       <table><tbody><tr><td colwidth="100" style="text-align:right">c</td></tr></tbody></table>
       <div><section><p>nested</p></section></div>
       <iframe src="x"></iframe>`,
    )

    const doc = docOf(editor)
    for (const type of typesIn(doc))
      expect([...SCHEMA_SPEC.nodes, ...SCHEMA_SPEC.marks]).toContain(type)
    walk(doc, (node) => {
      expect(Object.keys(node.attrs ?? {})).toEqual(attrsOf(node.type))
      for (const mark of node.marks ?? [])
        expect(Object.keys(mark.attrs ?? {})).toEqual(attrsOf(mark.type))
    })
  })

  it('puts inline content straight into table cells', () => {
    editor.commands.insertTable({ rows: 2, cols: 1, withHeaderRow: true })
    editor.commands.insertContentAt(3, 'cell')
    const [header, body] = docOf(editor).content?.[0].content ?? []
    expect(header.content?.[0]).toEqual({
      type: 'tableHeader',
      attrs: { colspan: 1, rowspan: 1 },
      content: [{ type: 'text', text: 'cell' }],
    })
    expect(body.content?.[0].content).toBeUndefined()
  })

  it('drops an unrepresentable heading level to a paragraph on paste', () => {
    pasteHTML(editor, '<h5>demoted</h5>')
    expect(docOf(editor).content?.[0].type).toBe('paragraph')
  })

  it('holds frontmatter on the doc node', () => {
    const frontmatter = '---\ntitle: x\n---'
    editor.view.dispatch(editor.state.tr.setDocAttribute('frontmatter', frontmatter))
    expect(docOf(editor).attrs).toEqual({ frontmatter })
    editor.view.dispatch(editor.state.tr.setDocAttribute('frontmatter', null))
  })
})
