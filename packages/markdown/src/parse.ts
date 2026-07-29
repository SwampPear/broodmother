import MarkdownIt from 'markdown-it'
import type Token from 'markdown-it/lib/token.mjs'
import type { DocNode, HeadingLevel, Mark, WikiLinkAttrs } from '@broodmother/shared'
import { SCHEMA_SPEC } from '@broodmother/shared'
import { math } from './math'
import { wikilink } from './wikilink'

const parser = new MarkdownIt('default', {
  html: false,
  linkify: false,
  typographer: false,
})
  .use(wikilink)
  .use(math)

const FRONTMATTER = /^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/

export function parse(source: string): DocNode {
  const text = source.replace(/\r\n/g, '\n')
  const fence = FRONTMATTER.exec(text)
  const body = fence ? text.slice(fence[0].length).replace(/^\n/, '') : text
  const content = tasks(blocks(parser.parse(body, {}), body.split('\n')))
  const frontmatter = fence ? fence[0].replace(/\n$/, '') : null
  return { type: 'doc', attrs: { frontmatter }, content }
}

function blocks(tokens: Token[], lines: string[]): DocNode[] {
  const root: DocNode = { type: 'doc', content: [] }
  const stack = [root]
  const top = () => stack[stack.length - 1]
  const add = (node: DocNode) => top().content!.push(node)
  const open = (node: DocNode) => {
    add(node)
    stack.push(node)
  }

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    switch (t.type) {
      case 'heading_open': {
        const level = Number(t.tag.slice(1))
        if (level > 4) {
          add(literal(t, lines))
          while (tokens[i].type !== 'heading_close') i++
        } else {
          open({ type: 'heading', attrs: { level: level as HeadingLevel }, content: [] })
        }
        break
      }
      case 'paragraph_open':
        open({ type: 'paragraph', content: [] })
        break
      case 'blockquote_open':
        open({ type: 'blockquote', content: [] })
        break
      case 'bullet_list_open':
        open({ type: 'bulletList', content: [] })
        break
      case 'ordered_list_open':
        open({
          type: 'orderedList',
          attrs: { start: Number(t.attrGet('start') ?? 1) },
          content: [],
        })
        break
      case 'list_item_open':
        open({ type: 'listItem', content: [] })
        break
      case 'table_open':
        open({ type: 'table', content: [] })
        break
      case 'tr_open':
        open({ type: 'tableRow', content: [] })
        break
      case 'th_open':
        open({ type: 'tableHeader', attrs: { colspan: 1, rowspan: 1 }, content: [] })
        break
      case 'td_open':
        open({ type: 'tableCell', attrs: { colspan: 1, rowspan: 1 }, content: [] })
        break
      case 'heading_close':
      case 'paragraph_close':
      case 'blockquote_close':
      case 'bullet_list_close':
      case 'ordered_list_close':
      case 'list_item_close':
      case 'table_close':
      case 'tr_close':
      case 'th_close':
      case 'td_close':
        stack.pop()
        break
      case 'thead_open':
      case 'thead_close':
      case 'tbody_open':
      case 'tbody_close':
        break
      case 'inline':
        inline(t.children ?? [], top())
        break
      case 'fence':
      case 'code_block': {
        const code = t.content.replace(/\n$/, '')
        add({
          type: 'codeBlock',
          attrs: { language: t.info.trim() || null },
          content: code ? [{ type: 'text', text: code }] : [],
        })
        break
      }
      case 'math_block':
        add(mathNode('mathBlock', t))
        break
      case 'hr':
        add({ type: 'horizontalRule' })
        break
      default:
        if (t.map) add(literal(t, lines))
    }
  }
  return root.content!
}

const mathNode = (type: 'math' | 'mathBlock', t: Token): DocNode => ({
  type,
  content: [{ type: 'text', text: t.content }],
})

const literal = (t: Token, lines: string[]): DocNode => ({
  type: 'paragraph',
  content: [
    { type: 'text', text: lines.slice(t.map![0], t.map![1]).join('\n').trimEnd() },
  ],
})

function inline(tokens: Token[], parent: DocNode) {
  const out = parent.content!
  const marks: Mark[] = []
  const emit = (text: string) => {
    const sorted = marks.length ? sortMarks(marks) : undefined
    const last = out[out.length - 1]
    if (last?.type === 'text' && JSON.stringify(last.marks) === JSON.stringify(sorted))
      last.text += text
    else out.push(sorted ? { type: 'text', text, marks: sorted } : { type: 'text', text })
  }
  /** An atom still sits inside whatever marks are open around it. */
  const push = (node: DocNode) => {
    if (marks.length) node.marks = sortMarks(marks)
    out.push(node)
  }

  for (const t of tokens) {
    switch (t.type) {
      case 'text':
        if (t.content) emit(t.content)
        break
      case 'softbreak':
      case 'hardbreak':
        emit('\n')
        break
      case 'code_inline':
        marks.push({ type: 'code' })
        emit(t.content)
        marks.pop()
        break
      case 'math_inline':
        push(mathNode('math', t))
        break
      case 'wikilink':
        marks.push({ type: 'wikiLink', attrs: t.meta as WikiLinkAttrs })
        emit((t.meta as WikiLinkAttrs).alias ?? (t.meta as WikiLinkAttrs).target)
        marks.pop()
        break
      case 'strong_open':
        marks.push({ type: 'bold' })
        break
      case 'em_open':
        marks.push({ type: 'italic' })
        break
      case 's_open':
        marks.push({ type: 'strike' })
        break
      case 'link_open':
        marks.push({
          type: 'link',
          attrs: { href: t.attrGet('href') ?? '', title: t.attrGet('title') },
        })
        break
      case 'strong_close':
      case 'em_close':
      case 's_close':
      case 'link_close':
        marks.pop()
        break
      case 'image':
        push({
          type: 'image',
          attrs: {
            src: t.attrGet('src') ?? '',
            alt: t.content || null,
            title: t.attrGet('title'),
          },
        })
        break
      default:
        if (t.content) emit(t.content)
    }
  }
}

/** `SCHEMA_SPEC.marks` is the canonical nesting order, so a mark set has one spelling. */
export const sortMarks = (marks: Mark[]): Mark[] =>
  [...marks].sort(
    (a, b) => SCHEMA_SPEC.marks.indexOf(a.type) - SCHEMA_SPEC.marks.indexOf(b.type),
  )

const TASK = /^\[([ xX])\](?: |$)/

const leadText = (item: DocNode): DocNode[] | undefined => {
  const first = item.content?.[0]
  if (first?.type !== 'paragraph') return undefined
  const text = first.content?.[0]
  return text?.type === 'text' && !text.marks ? first.content : undefined
}

/** markdown-it has no task lists: a bullet list whose every item starts `[ ]` is one. */
function tasks(nodes: DocNode[]): DocNode[] {
  for (const node of nodes) {
    if (node.content) node.content = tasks(node.content)
    if (node.type !== 'bulletList') continue
    const leads = node.content!.map(leadText)
    const boxes = leads.map((lead) => (lead ? TASK.exec(lead[0].text!) : null))
    if (!boxes.every((box) => box)) continue
    node.type = 'taskList'
    node.content!.forEach((item, i) => {
      item.type = 'taskItem'
      item.attrs = { checked: boxes[i]![1] !== ' ' }
      const lead = leads[i]!
      lead[0].text = lead[0].text!.slice(boxes[i]![0].length)
      if (!lead[0].text) lead.shift()
    })
  }
  return nodes
}
