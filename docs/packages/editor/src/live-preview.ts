import { syntaxTree } from '@codemirror/language'
import { type EditorState, type Range, RangeSet, StateField } from '@codemirror/state'
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view'
import { MathWidget, findMath } from './math'

/**
 * Obsidian's rule, in one place so every construct reveals identically: a block marker
 * shows when the cursor is on its line, an inline marker when a selection overlaps the
 * element it belongs to. Everything else stays hidden.
 */
const touches = (state: EditorState, from: number, to: number) =>
  state.selection.ranges.some((range) => range.from <= to && range.to >= from)

const onLine = (state: EditorState, pos: number) => {
  const line = state.doc.lineAt(pos)
  return touches(state, line.from, line.to)
}

const hidden = Decoration.replace({})

class BulletWidget extends WidgetType {
  eq() {
    return true
  }
  toDOM() {
    const dot = document.createElement('span')
    dot.className = 'cm-bullet'
    dot.textContent = '•'
    return dot
  }
}

class TaskWidget extends WidgetType {
  constructor(
    readonly checked: boolean,
    readonly from: number,
  ) {
    super()
  }

  eq(other: TaskWidget) {
    return other.checked === this.checked && other.from === this.from
  }

  toDOM(view: EditorView) {
    const box = document.createElement('input')
    box.type = 'checkbox'
    box.className = 'cm-task'
    box.checked = this.checked
    box.addEventListener('mousedown', (event) => {
      event.preventDefault()
      view.dispatch({
        changes: {
          from: this.from + 1,
          to: this.from + 2,
          insert: this.checked ? ' ' : 'x',
        },
      })
    })
    return box
  }

  ignoreEvent() {
    return false
  }
}

/** Marks whose parent element decides whether they show. */
const INLINE_MARKS = new Set(['EmphasisMark', 'StrikethroughMark', 'LinkMark'])

const inCode = (state: EditorState, pos: number) => {
  for (let node = syntaxTree(state).resolveInner(pos, 1); node; node = node.parent!) {
    if (/Code|FencedCode|CodeText|InlineCode/.test(node.name)) return true
    if (!node.parent) return false
  }
  return false
}

function build(state: EditorState): DecorationSet {
  const ranges: Range<Decoration>[] = []
  const tree = syntaxTree(state)

  tree.iterate({
    enter: (node) => {
      const { name, from, to } = node

      if (name === 'HeaderMark') {
        // The trailing space belongs to the marker; hiding it too keeps the text flush.
        const end = state.doc.sliceString(to, to + 1) === ' ' ? to + 1 : to
        if (!onLine(state, from)) ranges.push(hidden.range(from, end))
        return
      }

      if (name === 'ListMark') {
        if (onLine(state, from)) return
        const text = state.doc.sliceString(from, to)
        if (/^[-*+]$/.test(text))
          ranges.push(Decoration.replace({ widget: new BulletWidget() }).range(from, to))
        return
      }

      if (name === 'TaskMarker') {
        const checked = /[xX]/.test(state.doc.sliceString(from, to))
        ranges.push(
          Decoration.replace({ widget: new TaskWidget(checked, from) }).range(from, to),
        )
        return
      }

      if (name === 'CodeMark' && node.node.parent?.name === 'InlineCode') {
        const parent = node.node.parent
        if (!touches(state, parent.from, parent.to)) ranges.push(hidden.range(from, to))
        return
      }

      if (INLINE_MARKS.has(name)) {
        const parent = node.node.parent ?? node.node
        if (!touches(state, parent.from, parent.to)) ranges.push(hidden.range(from, to))
        return
      }

      // `](url)` — hidden with the brackets, leaving the link text alone.
      if (name === 'URL' && node.node.parent?.name === 'Link') {
        const parent = node.node.parent
        if (!touches(state, parent.from, parent.to)) ranges.push(hidden.range(from, to))
      }
    },
  })

  for (const span of findMath(state.doc.toString())) {
    if (inCode(state, span.from) || touches(state, span.from, span.to)) continue
    ranges.push(
      Decoration.replace({ widget: new MathWidget(span.latex, span.block) }).range(
        span.from,
        span.to,
      ),
    )
  }

  for (const link of state.doc.toString().matchAll(/\[\[([^\]\n]+)\]\]/g)) {
    const from = link.index
    const to = from + link[0].length
    if (inCode(state, from)) continue
    const alias = link[1].indexOf('|')
    if (!touches(state, from, to)) {
      ranges.push(hidden.range(from, from + 2))
      ranges.push(hidden.range(to - 2, to))
      if (alias >= 0) ranges.push(hidden.range(from + 2, from + 3 + alias))
    }
    ranges.push(Decoration.mark({ class: 'cm-wikilink' }).range(from + 2, to - 2))
  }

  return RangeSet.of(ranges, true)
}

export const livePreview = StateField.define<DecorationSet>({
  create: build,
  update: (value, tr) =>
    tr.docChanged || tr.selection || tr.effects.length ? build(tr.state) : value,
  provide: (field) => [
    EditorView.decorations.from(field),
    EditorView.atomicRanges.of((view) => view.state.field(field)),
  ],
})
