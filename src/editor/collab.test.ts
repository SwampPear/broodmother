import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import type * as Monaco from 'monaco-editor'
import type { CollabSession } from '@/collab'
import type { Cursor, SessionState } from '@/types'
import { bindSession } from './collab'
import type { MonacoApi } from './monaco'

/**
 * Enough of a Monaco model to be wrong in the same ways a real one would: offsets are
 * translated through line and column, and every edit raises the event the binding listens
 * for. The delta arithmetic is the part of this file that can silently corrupt a document,
 * and it is arithmetic — it does not need a browser to be tested.
 */
class FakeModel {
  text = ''
  private listeners: Array<(event: { changes: Array<Record<string, unknown>> }) => void> =
    []

  constructor(text: string) {
    this.text = text
  }

  /** Answers the way Monaco does: with the way to stop listening. A fake that ignored
   *  disposal would let a test claim the binding let go when it had not. */
  onChange(listen: (event: { changes: Array<Record<string, unknown>> }) => void) {
    this.listeners.push(listen)
    return () => {
      this.listeners = this.listeners.filter((one) => one !== listen)
    }
  }

  getValue() {
    return this.text
  }

  getValueLength() {
    return this.text.length
  }

  getPositionAt(offset: number) {
    const before = this.text.slice(0, Math.max(0, Math.min(offset, this.text.length)))
    const lines = before.split('\n')
    return { lineNumber: lines.length, column: lines[lines.length - 1]!.length + 1 }
  }

  getOffsetAt(position: { lineNumber: number; column: number }) {
    const lines = this.text.split('\n')
    let offset = 0
    for (let line = 0; line < position.lineNumber - 1; line++)
      offset += lines[line]!.length + 1
    return offset + position.column - 1
  }

  getFullModelRange() {
    return new FakeRange(1, 1, this.text.split('\n').length, 0)
  }

  applyEdits(edits: Array<{ range: FakeRange; text: string }>) {
    for (const edit of edits) this.replace(edit.range, edit.text)
  }

  pushEditOperations(
    _selections: unknown,
    edits: Array<{ range: FakeRange; text: string }>,
  ) {
    // The whole-document range the binding builds for its first edit.
    for (const edit of edits) {
      const changes = [{ rangeOffset: 0, rangeLength: this.text.length, text: edit.text }]
      this.text = edit.text
      for (const listen of this.listeners) listen({ changes })
    }
  }

  /** Somebody typing. Monaco reports the offset and length in the document as it stood. */
  type(offset: number, text: string, deleting = 0) {
    const changes = [{ rangeOffset: offset, rangeLength: deleting, text }]
    this.text = this.text.slice(0, offset) + text + this.text.slice(offset + deleting)
    for (const listen of this.listeners) listen({ changes })
  }

  private replace(range: FakeRange, text: string) {
    const from = this.getOffsetAt({
      lineNumber: range.startLineNumber,
      column: range.startColumn,
    })
    const to = this.getOffsetAt({
      lineNumber: range.endLineNumber,
      column: range.endColumn,
    })
    const changes = [{ rangeOffset: from, rangeLength: to - from, text }]
    this.text = this.text.slice(0, from) + text + this.text.slice(to)
    for (const listen of this.listeners) listen({ changes })
  }
}

class FakeRange {
  constructor(
    readonly startLineNumber: number,
    readonly startColumn: number,
    readonly endLineNumber: number,
    readonly endColumn: number,
  ) {}

  static fromPositions(
    from: { lineNumber: number; column: number },
    to: { lineNumber: number; column: number },
  ) {
    return new FakeRange(from.lineNumber, from.column, to.lineNumber, to.column)
  }
}

function fakes(initial: string) {
  const model = new FakeModel(initial)
  const decorations: unknown[][] = []
  const editor = {
    getModel: () => model,
    getSelections: () => [],
    getSelection: () => null,
    onDidChangeModelContent: (listen: (event: { changes: unknown[] }) => void) => {
      const stop = model.onChange(listen as never)
      return { dispose: stop }
    },
    onDidChangeCursorSelection: () => ({ dispose: () => {} }),
    createDecorationsCollection: () => ({
      set: (marks: unknown[]) => decorations.push(marks),
      clear: () => {},
    }),
  } as unknown as Monaco.editor.IStandaloneCodeEditor
  return {
    model,
    editor,
    decorations,
    monaco: { Range: FakeRange } as unknown as MonacoApi,
  }
}

function session(text: Y.Text, peers: SessionState['peers'] = []): CollabSession {
  const handlers = new Set<() => void>()
  return {
    text,
    awareness: {
      on: (_event: string, handler: () => void) => handlers.add(handler),
      off: (_event: string, handler: () => void) => handlers.delete(handler),
    },
    state: () => ({ mode: 'live', peers, text: text.toString(), mine: null }),
    subscribe: () => () => {},
    setCursor: (_cursor: Cursor | null) => {},
    takeRoom: () => {},
    keepMine: () => {},
    close: async () => {},
  } as unknown as CollabSession
}

function room(initial: string) {
  const doc = new Y.Doc()
  const text = doc.getText('content')
  if (initial) text.insert(0, initial)
  return { doc, text }
}

describe('binding a model to a session', () => {
  it('makes the model say what the room says, on the way in', () => {
    const { text } = room('the room')
    const { editor, model, monaco } = fakes('what was on screen')

    bindSession(editor, monaco, session(text))
    expect(model.getValue()).toBe('the room')
    // And the model's own change event, raised by that edit, has not been read back as
    // somebody typing — which would have written the room's text into the room a second time.
    expect(text.toString()).toBe('the room')
  })

  it('carries what is typed into the shared text', () => {
    const { text } = room('hello')
    const { editor, model, monaco } = fakes('hello')
    bindSession(editor, monaco, session(text))

    model.type(5, ' world')
    expect(text.toString()).toBe('hello world')
    expect(model.getValue()).toBe('hello world')
  })

  it('carries a deletion too', () => {
    const { text } = room('hello world')
    const { editor, model, monaco } = fakes('hello world')
    bindSession(editor, monaco, session(text))

    model.type(5, '', 6)
    expect(text.toString()).toBe('hello')
  })

  it('carries a replacement, which is both at once', () => {
    const { text } = room('hello world')
    const { editor, model, monaco } = fakes('hello world')
    bindSession(editor, monaco, session(text))

    model.type(6, 'there', 5)
    expect(text.toString()).toBe('hello there')
  })

  it('brings an insert from the room into the model', () => {
    const { text } = room('hello')
    const { editor, model, monaco } = fakes('hello')
    bindSession(editor, monaco, session(text))

    text.insert(5, ' world')
    expect(model.getValue()).toBe('hello world')
  })

  it('brings a delete from the room into the model', () => {
    const { text } = room('hello world')
    const { editor, model, monaco } = fakes('hello world')
    bindSession(editor, monaco, session(text))

    text.delete(5, 6)
    expect(model.getValue()).toBe('hello')
  })

  it('brings a change in the middle of a delta into the right place', () => {
    const { text, doc } = room('one\ntwo\nthree')
    const { editor, model, monaco } = fakes('one\ntwo\nthree')
    bindSession(editor, monaco, session(text))

    // A retain, then a delete, then an insert — the shape a middle-of-document edit takes.
    doc.transact(() => {
      text.delete(4, 3)
      text.insert(4, 'TWO')
    })
    expect(model.getValue()).toBe('one\nTWO\nthree')
  })

  it('does not send a change from the room back to the room', () => {
    const { text } = room('hello')
    const { editor, monaco } = fakes('hello')
    bindSession(editor, monaco, session(text))

    text.insert(5, '!')
    // Doubled text is what an echo looks like: the model would apply the insert and report
    // it as typing, which would insert it again.
    expect(text.toString()).toBe('hello!')
  })

  it('lets go of both directions when it is disposed', () => {
    const { text } = room('hello')
    const { editor, model, monaco } = fakes('hello')
    const stop = bindSession(editor, monaco, session(text))
    stop()

    text.insert(5, ' from the room')
    expect(model.getValue()).toBe('hello')

    model.type(5, ' typed here')
    expect(text.toString()).toBe('hello from the room')
  })

  it('survives a model with nothing in it', () => {
    const { text } = room('')
    const { editor, model, monaco } = fakes('')
    bindSession(editor, monaco, session(text))

    text.insert(0, 'first words')
    expect(model.getValue()).toBe('first words')
  })
})

describe('drawing the other people', () => {
  it('draws a caret and a selection for a peer that has one', () => {
    const { text } = room('hello world')
    const peers = [
      { id: 1, name: 'ada', color: '#ff0000', cursor: { anchor: 0, head: 5 } },
      { id: 2, name: 'grace', color: '#00ff00', cursor: null },
    ]
    const { editor, monaco, decorations } = fakes('hello world')
    bindSession(editor, monaco, session(text, peers))

    // A selection and a caret for ada; nothing at all for grace, who has no cursor —
    // drawing one would put her at the top of the file, where she is not.
    expect(decorations.at(-1)).toHaveLength(2)
  })

  it('draws a caret past the end of the document at the end of it', () => {
    const { text } = room('hi')
    const peers = [
      { id: 1, name: 'ada', color: '#ff0000', cursor: { anchor: 99, head: 99 } },
    ]
    const { editor, monaco, decorations } = fakes('hi')

    expect(() => bindSession(editor, monaco, session(text, peers))).not.toThrow()
    expect(decorations.at(-1)).toHaveLength(1)
  })
})
