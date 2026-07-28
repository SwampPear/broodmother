import { SCHEMA_SPEC, type MarkName } from '@docs/shared'
import { Blockquote } from '@tiptap/extension-blockquote'
import { Bold } from '@tiptap/extension-bold'
import { Code } from '@tiptap/extension-code'
import { CodeBlock } from '@tiptap/extension-code-block'
import { Document } from '@tiptap/extension-document'
import { Heading } from '@tiptap/extension-heading'
import { HorizontalRule } from '@tiptap/extension-horizontal-rule'
import { Image } from '@tiptap/extension-image'
import { Italic } from '@tiptap/extension-italic'
import { BulletList, ListItem, OrderedList, TaskList } from '@tiptap/extension-list'
import { Link } from '@tiptap/extension-link'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Strike } from '@tiptap/extension-strike'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { Text } from '@tiptap/extension-text'
import { Dropcursor, Gapcursor } from '@tiptap/extensions'
import { Math, MathBlock } from './math'
import { TaskItem } from './task-item'
import { WikiLink } from './wiki-link'

const cellAttributes = () => ({ colspan: { default: 1 }, rowspan: { default: 1 } })

/**
 * Tiptap ranks marks in the schema by extension priority, and that rank is the nesting
 * order — so it is read off `SCHEMA_SPEC.marks`, outermost first, and never written twice.
 * The whole band sits below the nodes' default 100, which keeps node order untouched and
 * puts every node keymap ahead of Mod-b's shift fallback swallowing Mod-Shift-b.
 */
const nesting = (mark: MarkName) =>
  SCHEMA_SPEC.marks.length - SCHEMA_SPEC.marks.indexOf(mark)

/**
 * Every attribute the upstream extensions add beyond the shared spec is stripped here.
 * An attribute markdown can't express is as lossy as a node markdown can't express.
 */
export const schemaExtensions = [
  Document.extend({ addAttributes: () => ({ frontmatter: { default: null } }) }),
  Paragraph,
  Text,
  Heading.configure({ levels: [...SCHEMA_SPEC.headingLevels] }),
  BulletList,
  OrderedList.extend({ addAttributes: () => ({ start: { default: 1 } }) }),
  ListItem,
  TaskList,
  TaskItem,
  CodeBlock,
  Math,
  MathBlock,
  Blockquote,
  Table,
  TableRow,
  // Inline content, not `block+`: a markdown pipe table cell cannot hold a block, and the
  // codec puts inline content straight into a cell.
  TableCell.extend({ content: 'inline*', addAttributes: cellAttributes }),
  TableHeader.extend({ content: 'inline*', addAttributes: cellAttributes }),
  HorizontalRule,
  Image.extend({
    addAttributes: () => ({
      src: { default: '' },
      alt: { default: null },
      title: { default: null },
    }),
  }),
  Link.configure({
    openOnClick: false,
    markdownLinks: true,
    HTMLAttributes: { target: null, rel: null },
  }).extend({
    priority: nesting('link'),
    addAttributes: () => ({ href: { default: null }, title: { default: null } }),
  }),
  WikiLink.extend({ priority: nesting('wikiLink') }),
  Bold.extend({ priority: nesting('bold') }),
  Italic.extend({ priority: nesting('italic') }),
  Strike.extend({ priority: nesting('strike') }),
  Code.extend({ priority: nesting('code') }),
  Dropcursor,
  Gapcursor,
]
