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
    'blockquote',
    'table',
    'tableRow',
    'tableCell',
    'tableHeader',
    'horizontalRule',
    'image',
  ],
  marks: ['bold', 'italic', 'code', 'strike', 'link', 'wikiLink'],
  headingLevels: [1, 2, 3, 4],
} as const

export type NodeName = (typeof SCHEMA_SPEC.nodes)[number]
export type MarkName = (typeof SCHEMA_SPEC.marks)[number]
export type HeadingLevel = (typeof SCHEMA_SPEC.headingLevels)[number]

export interface DocAttrs {
  /** Raw YAML frontmatter including its `---` fences, verbatim. Never reformatted. */
  frontmatter?: string
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
export interface MathAttrs {
  /** `$$…$$` when true, `$…$` when false. Body is verbatim LaTeX, never parsed. */
  display: boolean
}
export interface ImageAttrs {
  src: string
  alt: string | null
  title: string | null
}
export interface TableCellAttrs {
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

export type NodeAttrs =
  | DocAttrs
  | HeadingAttrs
  | OrderedListAttrs
  | TaskItemAttrs
  | CodeBlockAttrs
  | MathAttrs
  | ImageAttrs
  | TableCellAttrs

export type MarkAttrs = LinkAttrs | WikiLinkAttrs

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
