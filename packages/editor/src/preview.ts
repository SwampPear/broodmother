import type * as Monaco from 'monaco-editor'
import { rangeOf } from './commands'
import { renderMath } from './math'
import { revealed, scan, type Align, type Span, type Table } from './scan'

type Editor = Monaco.editor.IStandaloneCodeEditor

/**
 * Taking lines out of the view entirely, which is the only way a rendered equation stands
 * where its source was rather than under it. Hiding the text leaves the row; collapsing the
 * row through a decoration's `lineHeight` does not take, measured at 27px either way. This
 * is what the folding widget uses, and it is on the editor at runtime without being in the
 * published API — so it is reached for carefully and the editor still works without it.
 */
type Foldable = Editor & {
  setHiddenAreas?: (ranges: Monaco.IRange[], source?: unknown) => void
}

const HIDDEN = { inlineClassName: 'md-hidden' } as const

/** The classes that draw something other than the characters underneath them. */
const GLYPHS = /md-(bullet|task)/

/**
 * Markdown drawn as what it means rather than as what it says, following the same rule
 * everywhere: a marker hides until a cursor or selection is inside the element it belongs
 * to, and comes straight back when one is.
 *
 * A display equation obeys the same rule with more machinery behind it. Monaco has no way
 * to swap a range of lines for rendered DOM, so the swap is made of three parts: the source
 * text is hidden, its lines are collapsed to a hairline, and the equation is drawn in a view
 * zone at the same place. Put the cursor in it and all three come off at once, leaving the
 * LaTeX to be edited.
 */
export class LivePreview {
  private decorations: Monaco.editor.IEditorDecorationsCollection
  private zones: string[] = []
  /** What is currently drawn, so a keystroke elsewhere does not rebuild every equation. */
  private drawn = new Map<string, Piece>()
  private folded = ''
  /** A block a click is about to open. The caret cannot be moved into a hidden line, so the
   *  lines come back first and this is what tells the next refresh to leave them alone. */
  private pending: Span | null = null
  /** Where the checkboxes are, as of the last draw. */
  private boxes: { box: Span; done: boolean }[] = []
  private disposables: Monaco.IDisposable[] = []
  private enabled = false
  /**
   * Monaco always has a cursor, focused or not, and it starts at the top of the document —
   * so a note nobody has clicked into would open with its first heading's `#` showing. An
   * unfocused editor is one being read, and a reader has no cursor.
   */
  private focused = false

  constructor(
    private readonly editor: Editor,
    private readonly monaco: typeof Monaco,
  ) {
    this.decorations = editor.createDecorationsCollection([])
    this.disposables.push(
      editor.onDidChangeModelContent(() => this.refresh()),
      editor.onDidChangeCursorSelection(() => this.refresh()),
      editor.onDidChangeModel(() => this.refresh()),
      editor.onDidFocusEditorText(() => {
        this.focused = true
        this.refresh()
      }),
      editor.onDidBlurEditorText(() => {
        this.focused = false
        this.refresh()
      }),
      // A checkbox is the one decoration you can operate rather than only read, so the
      // editor's own mouse events are where the click is caught: a decoration is painted
      // text, and painted text has nothing to listen on.
      editor.onMouseDown((event) => this.onMouseDown(event)),
    )
    this.focused = editor.hasTextFocus()
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    this.refresh()
  }

  refresh(): void {
    const model = this.editor.getModel()
    if (!model) return
    if (!this.enabled || model.getLanguageId() !== 'markdown') return this.clear()

    const text = model.getValue()
    const cursors: Span[] = this.focused
      ? (this.editor.getSelections() ?? []).map((selection) => ({
          from: model.getOffsetAt(selection.getStartPosition()),
          to: model.getOffsetAt(selection.getEndPosition()),
        }))
      : []
    if (this.pending) cursors.push(this.pending)

    const found = scan(text)
    const decorations: Monaco.editor.IModelDeltaDecoration[] = []

    for (const marker of found.markers) {
      if (revealed(marker.owner, cursors)) continue
      decorations.push({ range: rangeOf(model, marker.from, marker.to), options: HIDDEN })
    }
    for (const style of found.styled) {
      decorations.push({
        range: rangeOf(model, style.from, style.to),
        options: {
          inlineClassName: style.className,
          // A bullet and a checkbox are drawn in place of the characters they stand for, so
          // they are not the width of those characters. Monaco measures the text to place
          // the caret; this is how it is told the measurement changed.
          inlineClassNameAffectsLetterSpacing: GLYPHS.test(style.className),
        },
      })
    }

    // An equation you are inside is one you are writing, so it is source and nothing else.
    // One you are not is taken out of the view and drawn in its place.
    const drawn = found.blocks.filter((block) => !revealed(block, cursors))
    const folded: Monaco.IRange[] = drawn.map((block) =>
      rangeOf(model, block.from, block.to),
    )

    // A fence's own lines are not content either, and go the same way.
    for (const fence of found.fences) {
      if (revealed(fence.owner, cursors)) continue
      for (const line of [fence.open, fence.close])
        if (line) folded.push(rangeOf(model, line.from, line.to))
    }

    // A table is pipes and dashes as source and a table as a document, so it is swapped the
    // way an equation is — out of the view, and drawn where it stood.
    const tables = found.tables.filter((table) => !revealed(table, cursors))
    for (const table of tables) folded.push(rangeOf(model, table.from, table.to))

    this.boxes = found.tasks.map((task) => ({ box: task.box, done: task.done }))
    this.decorations.set(decorations)
    this.fold(folded)
    this.draw(model, drawn, tables)
  }

  /** Toggles the box that was clicked, and nothing else — a click anywhere but on one is a
   *  click in the text, which is the editor's business. */
  private onMouseDown(event: Monaco.editor.IEditorMouseEvent): void {
    const model = this.editor.getModel()
    const position = event.target.position
    if (!model || !position || !this.enabled) return
    if (model.getLanguageId() !== 'markdown') return

    const at = model.getOffsetAt(position)
    const hit = this.boxes.find((one) => at >= one.box.from && at <= one.box.to)
    if (!hit) return

    event.event.preventDefault()
    event.event.stopPropagation()
    this.editor.executeEdits('broodmother', [
      {
        range: rangeOf(model, hit.box.from + 1, hit.box.from + 2),
        text: hit.done ? ' ' : 'x',
      },
    ])
  }

  /** Lines nobody is editing, gone from the view rather than merely invisible. */
  private fold(ranges: Monaco.IRange[]): void {
    const editor = this.editor as Foldable
    if (typeof editor.setHiddenAreas !== 'function') return
    const key = ranges
      .map((r) => `${r.startLineNumber}-${r.endLineNumber}`)
      .sort()
      .join(',')
    if (key === this.folded) return
    this.folded = key
    editor.setHiddenAreas(ranges)
  }

  /** Everything drawn in place of its source: equations and tables both. */
  private draw(
    model: Monaco.editor.ITextModel,
    blocks: { from: number; to: number; latex: string }[],
    tables: Table[],
  ): void {
    // Keyed by line and content together: two equations that say the same thing are still
    // two equations, and a map keyed by the content alone would draw one of them.
    const wanted = new Map<string, Piece>()
    for (const block of blocks) {
      const line = model.getPositionAt(block.to).lineNumber
      wanted.set(`math:${line}:${block.latex}`, {
        kind: 'math',
        key: block.latex,
        line,
        from: block.from,
        latex: block.latex,
      })
    }
    for (const table of tables) {
      const line = model.getPositionAt(table.to).lineNumber
      wanted.set(`table:${line}:${table.from}`, {
        kind: 'table',
        key: `${table.header.join('|')}#${table.rows.length}`,
        line,
        from: table.from,
        table,
      })
    }

    // Nothing moved and nothing changed — redrawing would flicker every equation on every
    // keystroke, and a view zone is a DOM node, not a decoration.
    if (same(wanted, this.drawn)) return
    this.drawn = wanted

    // A view zone is given its height, not asked for it, and KaTeX's height is only known
    // once it has been laid out — so each equation is rendered offscreen and measured
    // before it is handed over.
    const rendered = [...wanted.values()].map((piece) => {
      const host = document.createElement('div')
      if (piece.kind === 'math') {
        host.className = 'md-math-zone'
        host.appendChild(renderMath(piece.latex, true))
      } else {
        host.className = 'md-table-zone'
        host.appendChild(renderTable(piece.table))
      }
      // Clicking what was drawn is how you edit it: the caret goes just inside where the
      // source starts, which reveals it by the same rule that hid it.
      const caret = piece.from + (piece.kind === 'math' ? 2 : 0)
      host.addEventListener('mousedown', (event) => {
        event.preventDefault()
        event.stopPropagation()
        this.focused = true
        // Order matters: the lines have to be back before the caret can be put in them.
        this.pending = { from: piece.from, to: caret }
        this.refresh()
        this.editor.setPosition(model.getPositionAt(caret))
        this.editor.focus()
        this.pending = null
      })
      return { host, line: piece.line, height: measure(host) }
    })

    this.editor.changeViewZones((accessor) => {
      for (const id of this.zones) accessor.removeZone(id)
      this.zones = rendered.map(({ host, line, height }) =>
        accessor.addZone({
          afterLineNumber: line,
          domNode: host,
          heightInPx: height,
          // Monaco would otherwise take the click and put the caret on a neighbouring line.
          suppressMouseDown: true,
        }),
      )
    })
  }

  private clear(): void {
    this.decorations.set([])
    this.fold([])
    if (!this.zones.length) return
    this.editor.changeViewZones((accessor) => {
      for (const id of this.zones) accessor.removeZone(id)
      this.zones = []
    })
    this.drawn = new Map()
  }

  dispose(): void {
    this.clear()
    for (const one of this.disposables) one.dispose()
    this.disposables = []
  }
}

/** One thing drawn where its source was. */
type Piece =
  | { kind: 'math'; key: string; line: number; from: number; latex: string }
  | { kind: 'table'; key: string; line: number; from: number; table: Table }

function same(a: Map<string, Piece>, b: Map<string, Piece>): boolean {
  if (a.size !== b.size) return false
  for (const [key, value] of a) {
    const other = b.get(key)
    if (!other || other.key !== value.key || other.line !== value.line) return false
  }
  return true
}

/** A pipe table as a table. Cells are set as text, never as markup: a vault is a folder of
 *  files anyone can write into, and a cell is not a place to run one of them. */
export function renderTable(table: Table): HTMLElement {
  const element = document.createElement('table')
  element.className = 'md-table'

  const head = element.createTHead().insertRow()
  table.header.forEach((cell, index) => {
    const th = document.createElement('th')
    th.textContent = cell
    setAlign(th, table.align[index] ?? null)
    head.appendChild(th)
  })

  const body = element.createTBody()
  for (const row of table.rows) {
    const tr = body.insertRow()
    table.header.forEach((_, index) => {
      const td = tr.insertCell()
      td.textContent = row[index] ?? ''
      setAlign(td, table.align[index] ?? null)
    })
  }
  return element
}

function setAlign(cell: HTMLTableCellElement, align: Align): void {
  if (align) cell.style.textAlign = align
}

/** Offscreen but laid out: `display: none` would measure zero. */
function measure(host: HTMLElement): number {
  const stage = document.createElement('div')
  stage.style.cssText =
    'position:absolute;visibility:hidden;pointer-events:none;left:-9999px;top:0'
  stage.appendChild(host)
  document.body.appendChild(stage)
  const height = host.getBoundingClientRect().height
  document.body.removeChild(stage)
  stage.removeChild(host)
  return Math.max(1, Math.ceil(height))
}
