import { HighlightStyle } from '@codemirror/language'
import { tags } from '@lezer/highlight'

/**
 * Styling only — every class is defined in the app's stylesheet. Nothing here changes the
 * document, so what you typed is what gets saved.
 */
export const markdownHighlight = HighlightStyle.define([
  { tag: tags.heading1, class: 'cm-h1' },
  { tag: tags.heading2, class: 'cm-h2' },
  { tag: tags.heading3, class: 'cm-h3' },
  { tag: tags.heading4, class: 'cm-h4' },
  { tag: tags.heading5, class: 'cm-h5' },
  { tag: tags.heading6, class: 'cm-h6' },
  { tag: tags.strong, class: 'cm-strong' },
  { tag: tags.emphasis, class: 'cm-emphasis' },
  { tag: tags.strikethrough, class: 'cm-strike' },
  { tag: tags.monospace, class: 'cm-code' },
  { tag: tags.link, class: 'cm-link' },
  { tag: tags.url, class: 'cm-url' },
  { tag: tags.quote, class: 'cm-quote' },
  { tag: tags.list, class: 'cm-list' },
  { tag: tags.processingInstruction, class: 'cm-mark' },
  { tag: tags.keyword, class: 'cm-keyword' },
  { tag: tags.string, class: 'cm-string' },
  { tag: tags.comment, class: 'cm-comment' },
  { tag: tags.number, class: 'cm-number' },
  { tag: tags.typeName, class: 'cm-type' },
  { tag: tags.variableName, class: 'cm-variable' },
])
