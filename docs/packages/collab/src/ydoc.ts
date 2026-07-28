import * as Y from 'yjs'
import type { DocAttrs, DocNode, Mark, MarkName, NodeAttrs, NodeName } from '@docs/shared'

export const FRAGMENT = 'prosemirror'

/**
 * A Y.XmlFragment has no attributes, so the doc node's frontmatter has nowhere to live in
 * the fragment y-prosemirror binds to. Without this map every session would silently strip
 * the YAML header off the file on its first flush.
 */
export const DOC_ATTRS = 'docAttrs'

type YChild = Y.XmlElement | Y.XmlText
type AnyAttrs = Record<string, unknown>

const marksToAttributes = (marks: Mark[] | undefined): AnyAttrs =>
  Object.fromEntries((marks ?? []).map((mark) => [mark.type, mark.attrs ?? {}]))

const attributesToMarks = (attributes: AnyAttrs | undefined): Mark[] =>
  Object.entries(attributes ?? {}).map(([type, attrs]) =>
    Object.keys(attrs as AnyAttrs).length
      ? { type: type as MarkName, attrs: attrs as Mark['attrs'] }
      : { type: type as MarkName },
  )

const textToY = (nodes: DocNode[]): Y.XmlText => {
  const text = new Y.XmlText()
  text.applyDelta(
    nodes.map((node) => ({
      insert: node.text ?? '',
      attributes: marksToAttributes(node.marks),
    })),
  )
  return text
}

const elementToY = (node: DocNode): Y.XmlElement => {
  const element = new Y.XmlElement(node.type)
  for (const [key, value] of Object.entries(node.attrs ?? {})) {
    // Yjs types attributes as strings but stores any JSON value, which is what node attrs
    // (heading level, taskItem checked) need — y-prosemirror relies on the same.
    if (value !== null) element.setAttribute(key, value as string)
  }
  element.insert(0, childrenToY(node.content ?? []))
  return element
}

/** Runs of text nodes share one Y.XmlText, matching y-prosemirror's own encoding. */
const childrenToY = (nodes: DocNode[]): YChild[] => {
  const children: YChild[] = []
  let run: DocNode[] = []
  const flushRun = () => {
    if (run.length) children.push(textToY(run))
    run = []
  }
  for (const node of nodes) {
    if (node.type === 'text') {
      run.push(node)
      continue
    }
    flushRun()
    children.push(elementToY(node))
  }
  flushRun()
  return children
}

const childrenFromY = (children: YChild[]): DocNode[] =>
  children.flatMap((child) =>
    child instanceof Y.XmlText ? textFromY(child) : [elementFromY(child as Y.XmlElement)],
  )

const textFromY = (text: Y.XmlText): DocNode[] =>
  text.toDelta().map((delta: { insert: string; attributes?: AnyAttrs }) => {
    const marks = attributesToMarks(delta.attributes)
    const node: DocNode = { type: 'text', text: delta.insert }
    return marks.length ? { ...node, marks } : node
  })

const elementFromY = (element: Y.XmlElement): DocNode => {
  const attrs = element.getAttributes() as unknown as NodeAttrs
  const content = childrenFromY(element.toArray() as YChild[])
  return {
    type: element.nodeName as NodeName,
    ...(Object.keys(attrs).length ? { attrs } : {}),
    ...(content.length ? { content } : {}),
  }
}

export const writeDoc = (doc: Y.Doc, node: DocNode): void => {
  const fragment = doc.getXmlFragment(FRAGMENT)
  const attrs = doc.getMap<string>(DOC_ATTRS)
  doc.transact(() => {
    fragment.delete(0, fragment.length)
    fragment.insert(0, childrenToY(node.content ?? []))
    const frontmatter = (node.attrs as DocAttrs | undefined)?.frontmatter
    if (frontmatter === undefined) attrs.delete('frontmatter')
    else attrs.set('frontmatter', frontmatter)
  })
}

export const readDoc = (doc: Y.Doc): DocNode => {
  const frontmatter = doc.getMap<string>(DOC_ATTRS).get('frontmatter')
  const content = childrenFromY(doc.getXmlFragment(FRAGMENT).toArray() as YChild[])
  return {
    type: 'doc',
    ...(frontmatter === undefined ? {} : { attrs: { frontmatter } }),
    ...(content.length ? { content } : {}),
  }
}

export const clearDoc = (doc: Y.Doc): void => writeDoc(doc, { type: 'doc' })
