/**
 * The exact markdown subset. Plan 01 serializes this set and plan 02 lets the user type
 * this set — that pairing is what makes round-tripping lossless, so it lives here and
 * nowhere else. Adding a member is a shared-types change, not a package change.
 */
export const SCHEMA_SPEC = {
  nodes: [
    'doc',
    'paragraph',
    'text',
    'heading',
    'bulletList',
    'orderedList',
    'listItem',
    'taskList',
    'taskItem',
    'codeBlock',
    'math',
    'mathBlock',
    'blockquote',
    'table',
    'tableRow',
    'tableCell',
    'tableHeader',
    'horizontalRule',
    'image',
  ],
  /** Canonical nesting order, outermost first. Both packages sort to this, so a given
   *  mark set has exactly one tree spelling. */
  marks: ['link', 'wikiLink', 'bold', 'italic', 'strike', 'code'],
  headingLevels: [1, 2, 3, 4],
} as const

type NodeName = (typeof SCHEMA_SPEC.nodes)[number]
type MarkName = (typeof SCHEMA_SPEC.marks)[number]
export type HeadingLevel = (typeof SCHEMA_SPEC.headingLevels)[number]

export interface DocAttrs {
  /** Raw YAML frontmatter including its `---` fences, verbatim. Never reformatted. */
  frontmatter: string | null
}
export interface HeadingAttrs {
  level: HeadingLevel
}
export interface OrderedListAttrs {
  start: number
}
export interface TaskItemAttrs {
  checked: boolean
}
export interface CodeBlockAttrs {
  language: string | null
}
export interface ImageAttrs {
  src: string
  alt: string | null
  title: string | null
}
interface TableCellAttrs {
  colspan: number
  rowspan: number
}
export interface LinkAttrs {
  href: string
  title: string | null
}
export interface WikiLinkAttrs {
  /** The target as written inside `[[...]]`, before any `|`. */
  target: string
  alias: string | null
}

type NodeAttrs =
  | DocAttrs
  | HeadingAttrs
  | OrderedListAttrs
  | TaskItemAttrs
  | CodeBlockAttrs
  | ImageAttrs
  | TableCellAttrs

type MarkAttrs = LinkAttrs | WikiLinkAttrs

export interface Mark {
  type: MarkName
  attrs?: MarkAttrs
}

export interface DocNode {
  type: NodeName
  attrs?: NodeAttrs
  content?: DocNode[]
  text?: string
  marks?: Mark[]
}
