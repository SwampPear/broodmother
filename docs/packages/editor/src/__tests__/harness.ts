import type { DocNode } from '@docs/shared'
import { Editor, type AnyExtension } from '@tiptap/core'
import { schemaExtensions } from '../schema'

export const headlessEditor = (extensions: AnyExtension[] = []) =>
  new Editor({ extensions: [...schemaExtensions, ...extensions], content: '<p></p>' })

export const typeText = (editor: Editor, text: string) => {
  for (const char of [...text]) {
    const { from, to } = editor.state.selection
    const insert = () => editor.state.tr.insertText(char, from, to)
    const handled = editor.view.someProp('handleTextInput', (run) =>
      run(editor.view, from, to, char, insert),
    )
    if (!handled) editor.view.dispatch(insert())
  }
}

export const pressKey = (editor: Editor, init: KeyboardEventInit) =>
  editor.view.someProp('handleKeyDown', (run) =>
    run(editor.view, new KeyboardEvent('keydown', init)),
  ) ?? false

/** jsdom has no ClipboardEvent, and prosemirror only uses it to consult handlers. */
export const pasteHTML = (editor: Editor, html: string) =>
  editor.view.pasteHTML(html, new Event('paste') as ClipboardEvent)

export const walk = (node: DocNode, visit: (node: DocNode) => void) => {
  visit(node)
  node.content?.forEach((child) => walk(child, visit))
}

export const typesIn = (doc: DocNode) => {
  const types = new Set<string>()
  walk(doc, (node) => {
    types.add(node.type)
    node.marks?.forEach((mark) => types.add(mark.type))
  })
  return types
}

export const docOf = (editor: Editor) => editor.getJSON() as DocNode
