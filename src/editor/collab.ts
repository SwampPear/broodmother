import type * as Monaco from 'monaco-editor'
import type * as Y from 'yjs'
import type { CollabSession } from '@/collab'
import type { Peer } from '@/types'
import type { MonacoApi } from './monaco'

/** The transaction origin this binding writes under, so that its own edits are not read back
 *  out of the text and applied to the model a second time. */
const TYPED = Symbol('typed here')

/**
 * The Monaco model and the session's `Y.Text`, kept the same thing. Written by hand rather
 * than taken from `y-monaco`, which is unmaintained and would be one more dependency for
 * eighty lines — and these eighty lines are the ones that decide whether somebody's typing
 * survives, so they are worth being able to read.
 *
 * Every edit carries an origin: what arrived from the room is applied to the model with the
 * model's listener standing down, and what was typed here is written into the text with the
 * text's observer standing down. Without that the two would answer each other forever.
 */
export function bindSession(
  editor: Monaco.editor.IStandaloneCodeEditor,
  monaco: MonacoApi,
  session: CollabSession,
): () => void {
  const model = editor.getModel()
  if (!model) return () => {}

  const text = session.text
  let applying = false

  // The session is what the document is now. Applied as an edit rather than a replacement so
  // that the undo stack and the scroll position survive being handed the room's version.
  const room = text.toString()
  if (model.getValue() !== room) {
    applying = true
    model.pushEditOperations(
      editor.getSelections(),
      [{ range: model.getFullModelRange(), text: room }],
      () => editor.getSelections(),
    )
    applying = false
  }

  const observer = (event: Y.YTextEvent) => {
    // What this editor just typed. It is already in the model — putting the delta back would
    // insert every keystroke twice.
    if (event.transaction.origin === TYPED) return
    applying = true
    let at = 0
    for (const op of event.delta) {
      if (typeof op.retain === 'number') at += op.retain
      else if (typeof op.insert === 'string') {
        const start = model.getPositionAt(at)
        model.applyEdits([
          {
            range: new monaco.Range(
              start.lineNumber,
              start.column,
              start.lineNumber,
              start.column,
            ),
            text: op.insert,
          },
        ])
        at += op.insert.length
      } else if (typeof op.delete === 'number') {
        const from = model.getPositionAt(at)
        const to = model.getPositionAt(at + op.delete)
        model.applyEdits([
          {
            range: new monaco.Range(
              from.lineNumber,
              from.column,
              to.lineNumber,
              to.column,
            ),
            text: '',
          },
        ])
      }
    }
    applying = false
  }
  text.observe(observer)

  // Monaco hands its changes back to front, so each one's offset still describes the document
  // the one before it has not touched yet — which is why they are applied in the order given.
  const typed = editor.onDidChangeModelContent((event) => {
    if (applying) return
    text.doc?.transact(() => {
      for (const change of event.changes) {
        if (change.rangeLength) text.delete(change.rangeOffset, change.rangeLength)
        if (change.text) text.insert(change.rangeOffset, change.text)
      }
    }, TYPED)
  })

  const moved = editor.onDidChangeCursorSelection(() => {
    const selection = editor.getSelection()
    if (!selection) return session.setCursor(null)
    session.setCursor({
      anchor: model.getOffsetAt(selection.getSelectionStart()),
      head: model.getOffsetAt(selection.getPosition()),
    })
  })

  const marks = editor.createDecorationsCollection()
  const draw = () => marks.set(decorationsFor(monaco, model, session.state().peers))
  session.awareness.on('update', draw)
  draw()

  return () => {
    text.unobserve(observer)
    typed.dispose()
    moved.dispose()
    session.awareness.off('update', draw)
    marks.clear()
  }
}

/** Everyone else's selection, and the edge of it their caret is on. A peer who has not put a
 *  cursor anywhere yet draws nothing rather than drawing one at the top of the file. */
function decorationsFor(
  monaco: MonacoApi,
  model: Monaco.editor.ITextModel,
  peers: Peer[],
): Monaco.editor.IModelDeltaDecoration[] {
  const marks: Monaco.editor.IModelDeltaDecoration[] = []
  for (const peer of peers) {
    if (!peer.cursor) continue
    const swatch = paint(peer.color)
    const anchor = model.getPositionAt(clamp(peer.cursor.anchor, model))
    const head = model.getPositionAt(clamp(peer.cursor.head, model))

    if (peer.cursor.anchor !== peer.cursor.head)
      marks.push({
        range: monaco.Range.fromPositions(anchor, head),
        options: { className: `peer-selection ${swatch}` },
      })

    marks.push({
      range: monaco.Range.fromPositions(head, head),
      options: {
        className: `peer-caret ${swatch}`,
        hoverMessage: { value: peer.name },
        stickiness: 1,
      },
    })
  }
  return marks
}

/** An offset from another machine describes that machine's document, and for a moment after
 *  an edit it does not describe this one. Past the end is drawn at the end. */
function clamp(offset: number, model: Monaco.editor.ITextModel): number {
  return Math.max(0, Math.min(offset, model.getValueLength()))
}

/**
 * A class per colour, made once and left in the page. Monaco styles a decoration by class
 * name and a peer's colour is theirs, so the alternative is a stylesheet that has to know
 * every profile colour before anyone joins.
 */
const painted = new Map<string, string>()

function paint(color: string): string {
  const known = painted.get(color)
  if (known) return known

  const name = `peer-${painted.size}`
  painted.set(color, name)
  if (typeof document === 'undefined') return name

  const style = document.createElement('style')
  style.textContent = `
    .peer-selection.${name} { background: ${color}33 }
    .peer-caret.${name} { border-left: 2px solid ${color}; margin-left: -1px }
  `
  document.head.append(style)
  return name
}
