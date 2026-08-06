import type { SCHEMA_SPEC } from '@/doc'

type NodeName = (typeof SCHEMA_SPEC.nodes)[number]
type MarkName = (typeof SCHEMA_SPEC.marks)[number]
export type HeadingLevel = (typeof SCHEMA_SPEC.headingLevels)[number]

export interface DocAttrs {
  frontmatter: string | null // raw YAML including its `---` fences, never reformatted
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
  target: string // the target as written inside `[[...]]`, before any `|`
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
