import type {
  CodeBlockAttrs,
  DocAttrs,
  DocNode,
  HeadingAttrs,
  ImageAttrs,
  LinkAttrs,
  Mark,
  OrderedListAttrs,
  TaskItemAttrs,
  WikiLinkAttrs,
} from '@/types'
import { parse, sortMarks } from './parse'

export function serialize(doc: DocNode): string {
  const { frontmatter } = (doc.attrs as DocAttrs | undefined) ?? {}
  const body = blocks(doc.content ?? [])
  if (!frontmatter) return body ? `${body}\n` : ''
  return body ? `${frontmatter}\n\n${body}\n` : `${frontmatter}\n`
}

const blocks = (nodes: DocNode[]): string => nodes.map(block).join('\n\n')

function block(node: DocNode): string {
  switch (node.type) {
    case 'paragraph':
      return verified(node, (esc) => inline(node.content ?? [], esc))
    case 'heading': {
      const { level } = node.attrs as HeadingAttrs
      return verified(
        node,
        (esc) => `${'#'.repeat(level)} ${inline(node.content ?? [], esc)}`,
      )
    }
    case 'codeBlock':
      return codeBlock(node)
    case 'mathBlock':
      return `$$\n${latex(node)}\n$$`
    case 'blockquote':
      return prefix(blocks(node.content ?? []), '> ', '>')
    case 'bulletList':
      return list(node, () => '- ')
    case 'taskList':
      return list(node, () => '- ', checkbox)
    case 'orderedList': {
      const { start } = node.attrs as OrderedListAttrs
      return list(node, (_, i) => `${start + i}. `)
    }
    case 'table':
      return verified(node, (esc) => table(node, esc))
    case 'horizontalRule':
      return '---'
    default:
      return inline([node], false)
  }
}

/**
 * Escaping is decided by trying it without: markdown that reparses to the same node needed
 * none. Nothing else knows whether a `*` in this position is literal.
 */
function verified(node: DocNode, render: (esc: boolean) => string): string {
  const plain = render(false)
  return equal(parse(plain).content, [node]) ? plain : render(true)
}

function codeBlock(node: DocNode): string {
  const text = node.content?.[0]?.text ?? ''
  const runs = [...text.matchAll(/^ {0,3}(`{3,})/gm)].map((m) => m[1].length)
  const fence = '`'.repeat(Math.max(3, ...runs.map((n) => n + 1)))
  const open = fence + ((node.attrs as CodeBlockAttrs).language ?? '')
  return text ? `${open}\n${text}\n${fence}` : `${open}\n${fence}`
}

/** A `mathBlock` always takes the fenced form; `$$x$$` on one line is the same node. */
const latex = (node: DocNode): string => node.content?.[0]?.text ?? ''

const prefix = (text: string, pad: string, empty: string): string =>
  text
    .split('\n')
    .map((line) => (line ? pad + line : empty))
    .join('\n')

const checkbox = (item: DocNode) =>
  `[${(item.attrs as TaskItemAttrs).checked ? 'x' : ' '}] `

/** The checkbox is item content, not marker, so it does not widen the continuation indent. */
function list(
  node: DocNode,
  bullet: (item: DocNode, index: number) => string,
  box: (item: DocNode) => string = () => '',
): string {
  const items = (node.content ?? []).map((item, i) => {
    const mark = bullet(item, i)
    const body = box(item) + itemBlocks(item.content ?? [])
    return mark + prefix(body, ' '.repeat(mark.length), '').slice(mark.length)
  })
  const loose = (node.content ?? []).some(
    (item) =>
      (item.content ?? []).filter((child) => child.type === 'paragraph').length > 1,
  )
  return items.join(loose ? '\n\n' : '\n')
}

/** Inside an item only paragraph-after-paragraph needs a blank line; a nested list does not. */
function itemBlocks(nodes: DocNode[]): string {
  return nodes.reduce((text, node, i) => {
    if (i === 0) return block(node)
    const tight = nodes[i - 1].type === 'paragraph' && startsList(node)
    return text + (tight ? '\n' : '\n\n') + block(node)
  }, '')
}

const startsList = (node: DocNode): boolean =>
  node.type === 'bulletList' ||
  node.type === 'taskList' ||
  (node.type === 'orderedList' && (node.attrs as OrderedListAttrs).start === 1)

function table(node: DocNode, esc: boolean): string {
  const rows = node.content ?? []
  if (!rows.length) return ''
  const cells = (row: DocNode) =>
    (row.content ?? []).map((cell) =>
      inline(cell.content ?? [], esc)
        .replace(/\|/g, '\\|')
        .replace(/\n/g, ' '),
    )
  const line = (values: string[]) =>
    `|${values.map((v) => (v ? ` ${v} ` : ' ')).join('|')}|`
  const head = cells(rows[0])
  const rule = `|${head.map(() => '---').join('|')}|`
  return [line(head), rule, ...rows.slice(1).map((row) => line(cells(row)))].join('\n')
}

const OPENERS: Record<string, string> = {
  bold: '**',
  italic: '*',
  strike: '~~',
  link: '[',
}

const closer = (mark: Mark): string => {
  if (mark.type !== 'link') return OPENERS[mark.type]
  const { href, title } = mark.attrs as LinkAttrs
  const target = /[\s<>]/.test(href) ? `<${href}>` : href
  return `](${target}${title === null ? '' : ` "${title}"`})`
}

/**
 * A mark already open stays open if the next leaf still carries it, whatever its position —
 * closing and reopening would emit `**` runs that no longer parse as the same marks.
 */
function inline(nodes: DocNode[], esc: boolean): string {
  let text = ''
  let open: Mark[] = []
  for (const node of nodes) {
    const marks = sortMarks((node.marks ?? []).filter((mark) => mark.type in OPENERS))
    let keep = 0
    while (keep < open.length && marks.some((mark) => equal(mark, open[keep]))) keep++
    for (let i = open.length - 1; i >= keep; i--) text += closer(open[i])
    open = open.slice(0, keep)
    for (const mark of marks) {
      if (open.some((o) => equal(o, mark))) continue
      text += OPENERS[mark.type]
      open.push(mark)
    }
    text += leaf(node, esc)
  }
  for (let i = open.length - 1; i >= 0; i--) text += closer(open[i])
  return text
}

function leaf(node: DocNode, esc: boolean): string {
  if (node.type === 'math') return `$${latex(node)}$`
  if (node.type === 'image') {
    const { src, alt, title } = node.attrs as ImageAttrs
    return `![${alt ?? ''}](${src}${title === null ? '' : ` "${title}"`})`
  }
  const marks = node.marks ?? []
  const wiki = marks.find((mark) => mark.type === 'wikiLink')
  if (wiki) {
    const { target, alias } = wiki.attrs as WikiLinkAttrs
    return `[[${alias === null ? target : `${target}|${alias}`}]]`
  }
  const text = node.text ?? ''
  if (!marks.some((mark) => mark.type === 'code')) return esc ? escape(text) : text
  const ticks = '`'.repeat(
    Math.max(0, ...[...text.matchAll(/`+/g)].map((m) => m[0].length)) + 1,
  )
  const pad = /^[ `]|[ `]$/.test(text) ? ' ' : ''
  return `${ticks}${pad}${text}${pad}${ticks}`
}

const escape = (text: string): string =>
  text.replace(/[\\`*_[\]<>~#|$]/g, '\\$&').replace(/^(\s*)([-+]|\d+[.)])/gm, '$1\\$2')

function equal(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) return false
  return keys.every((k) =>
    equal((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
  )
}
