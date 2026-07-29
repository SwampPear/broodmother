import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import type { DocNode } from '@mother/shared'
import { FRAGMENT, clearDoc, readDoc, writeDoc } from './ydoc'

const document: DocNode = {
  type: 'doc',
  attrs: { frontmatter: '---\ntitle: ECSEQ-1\n---' },
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Sensor stack' }],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Au/thiol-SAM ' },
        { type: 'text', text: 'anchors', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' the ' },
        {
          type: 'text',
          text: 'primer',
          marks: [
            { type: 'italic' },
            { type: 'link', attrs: { href: '/p.md', title: null } },
          ],
        },
      ],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: '2 µm pitch' }] },
          ],
        },
      ],
    },
  ],
}

describe('ydoc', () => {
  it('round-trips nodes, attrs, marks, and frontmatter', () => {
    const doc = new Y.Doc()

    writeDoc(doc, document)

    expect(readDoc(doc)).toEqual(document)
  })

  it('merges into another doc through a Yjs update', () => {
    const source = new Y.Doc()
    const target = new Y.Doc()

    writeDoc(source, document)
    Y.applyUpdate(target, Y.encodeStateAsUpdate(source))

    expect(readDoc(target)).toEqual(document)
  })

  it('groups runs of text into one Y.XmlText, as y-prosemirror does', () => {
    const doc = new Y.Doc()

    writeDoc(doc, document)

    const paragraph = doc.getXmlFragment(FRAGMENT).get(1) as Y.XmlElement
    expect(paragraph.length).toBe(1)
    expect(paragraph.get(0)).toBeInstanceOf(Y.XmlText)
  })

  it('clears content and frontmatter together', () => {
    const doc = new Y.Doc()
    writeDoc(doc, document)

    clearDoc(doc)

    expect(readDoc(doc)).toEqual({ type: 'doc', attrs: { frontmatter: null } })
  })
})
