import { describe, expect, it } from 'vitest'
import {
  continueList,
  hangingNewline,
  indent,
  outdent,
  renumber,
  type Edit,
  type Point,
} from '../lists'

/** The document a set of edits leaves behind, with `|` where the caret ends up. */
function apply(text: string, edits: Edit[] | null): string | null {
  if (!edits) return null
  const lines = text.split('\n')
  for (const edit of [...edits].sort((a, b) => b.start.line - a.start.line)) {
    const line = lines[edit.start.line] ?? ''
    const head = line.slice(0, edit.start.column)
    const tail = (lines[edit.end.line] ?? '').slice(edit.end.column)
    lines.splice(
      edit.start.line,
      edit.end.line - edit.start.line + 1,
      ...`${head}${edit.text}${tail}`.split('\n'),
    )
  }
  return lines.join('\n')
}

/** `|` marks the caret, the way the cases below are easiest to read. */
function at(text: string): { lines: string[]; carets: Point[] } {
  const lines = text.split('\n')
  const carets: Point[] = []
  lines.forEach((line, number) => {
    const column = line.indexOf('|')
    if (column >= 0) {
      carets.push({ line: number, column })
      lines[number] = line.replace('|', '')
    }
  })
  return { lines, carets }
}

function enter(text: string): string | null {
  const { lines, carets } = at(text)
  return apply(lines.join('\n'), continueList(lines, carets))
}

function shiftEnter(text: string): string | null {
  const { lines, carets } = at(text)
  return apply(lines.join('\n'), hangingNewline(lines, carets))
}

function tab(text: string, shift = false): string {
  const { lines, carets } = at(text)
  const regions = carets.map((caret) => ({ start: caret, end: caret }))
  const run = shift ? outdent : indent
  return apply(lines.join('\n'), run(lines, regions)) ?? ''
}

describe('enter', () => {
  it('continues a bullet', () => {
    expect(enter('- one|')).toBe('- one\n- ')
  })

  it('keeps the marker the list was written with', () => {
    expect(enter('* one|')).toBe('* one\n* ')
    expect(enter('+ one|')).toBe('+ one\n+ ')
  })

  it('keeps the indent a nested item stands at', () => {
    expect(enter('- one\n    - two|')).toBe('- one\n    - two\n    - ')
  })

  it('splits an item at the caret', () => {
    expect(enter('- one|two')).toBe('- one\n- two')
  })

  it('counts the next number rather than repeating this one', () => {
    expect(enter('1. one|')).toBe('1. one\n2. ')
    expect(enter('9. nine|')).toBe('9. nine\n10. ')
  })

  it('keeps the delimiter a numbered list was written with', () => {
    expect(enter('1) one|')).toBe('1) one\n2) ')
  })

  it('opens the next task unticked, whatever this one is', () => {
    expect(enter('- [ ] one|')).toBe('- [ ] one\n- [ ] ')
    expect(enter('- [x] one|')).toBe('- [x] one\n- [ ] ')
  })

  it('outdents an empty item a level at a time', () => {
    expect(enter('- one\n    - |')).toBe('- one\n- ')
  })

  it('outdents an empty item written with a tab', () => {
    expect(enter('- one\n\t- |')).toBe('- one\n- ')
  })

  it('takes the marker off an empty item at the left margin', () => {
    expect(enter('- one\n- |')).toBe('- one\n')
  })

  it('takes the marker off an empty task the same way', () => {
    expect(enter('- [ ] |')).toBe('')
  })

  it('leaves an empty numbered item behind as an empty line', () => {
    expect(enter('1. one\n2. |')).toBe('1. one\n')
  })

  it('finds the marker of the item a wrapped line belongs to', () => {
    expect(enter('- one\n  more|')).toBe('- one\n  more\n- ')
  })

  it('does not add a second marker when it splits in front of one', () => {
    expect(enter('- one |- two')).toBe('- one \n- two')
  })

  it('leaves a line that is not a list to the editor', () => {
    expect(enter('plain|')).toBeNull()
    expect(enter('# heading|')).toBeNull()
  })

  it('leaves the caret inside the marker to the editor', () => {
    expect(enter('-| one')).toBeNull()
  })

  it('leaves every caret alone when one of them is not a list', () => {
    expect(enter('- one|\nplain|')).toBeNull()
  })

  it('continues both when every caret is a list', () => {
    expect(enter('- one|\n- two|')).toBe('- one\n- \n- two\n- ')
  })

  it('drops the marker inside a quote and keeps the quote', () => {
    expect(enter('> - |')).toBe('> ')
  })
})

describe('shift enter', () => {
  it('breaks the line under the item text rather than under its marker', () => {
    expect(shiftEnter('- one|')).toBe('- one\n  ')
  })

  it('clears a checkbox out of the way too', () => {
    expect(shiftEnter('- [ ] one|')).toBe('- [ ] one\n      ')
  })

  it('leaves a plain line to the editor', () => {
    expect(shiftEnter('plain|')).toBeNull()
  })
})

describe('tab', () => {
  it('indents the item rather than typing a tab at the caret', () => {
    expect(tab('- on|e')).toBe('    - one')
  })

  it('indents from wherever the caret is on the line', () => {
    expect(tab('|- one')).toBe('    - one')
  })

  it('goes in after the quote marker rather than in front of it', () => {
    expect(tab('> - on|e')).toBe('>     - one')
  })

  it('indents every line a selection touches', () => {
    const lines = ['- one', '- two', '- three']
    const edits = indent(lines, [
      { start: { line: 0, column: 2 }, end: { line: 2, column: 3 } },
    ])
    expect(apply(lines.join('\n'), edits)).toBe('    - one\n    - two\n    - three')
  })

  it('leaves out a line the selection only stops at the head of', () => {
    const lines = ['- one', '- two']
    const edits = indent(lines, [
      { start: { line: 0, column: 0 }, end: { line: 1, column: 0 } },
    ])
    expect(apply(lines.join('\n'), edits)).toBe('    - one\n- two')
  })
})

describe('shift tab', () => {
  it('takes a level back off', () => {
    expect(tab('    - on|e', true)).toBe('- one')
  })

  it('takes a tab back off', () => {
    expect(tab('\t- on|e', true)).toBe('- one')
  })

  it('goes down to the level rather than back by a fixed width', () => {
    expect(tab('      - on|e', true)).toBe('  - one')
  })

  it('does nothing to a line that is already at the margin', () => {
    expect(tab('- on|e', true)).toBe('- one')
  })

  it('leaves the quote marker where it is', () => {
    expect(tab('>     - on|e', true)).toBe('> - one')
  })
})

describe('renumber', () => {
  const of = (text: string, touched: number[]) => {
    const lines = text.split('\n')
    return apply(text, renumber(lines, touched))
  }

  it('counts an item inserted in the middle, and everything under it', () => {
    expect(of('1. one\n1. new\n2. two\n3. three', [1])).toBe(
      '1. one\n2. new\n3. two\n4. three',
    )
  })

  it('leaves a list that already counts alone', () => {
    expect(of('1. one\n2. two\n3. three', [1])).toBe('1. one\n2. two\n3. three')
  })

  it('lets a list start where it says it starts', () => {
    expect(of('5. five\n6. six', [0])).toBe('5. five\n6. six')
  })

  it('counts a nested list on its own', () => {
    expect(of('1. one\n    1. a\n    1. b\n2. two', [2])).toBe(
      '1. one\n    1. a\n    2. b\n2. two',
    )
  })

  it('does not count across a list that a heading broke', () => {
    expect(of('1. one\n\n# other\n\n1. again', [4])).toBe('1. one\n\n# other\n\n1. again')
  })

  it('leaves a bullet list alone', () => {
    expect(of('- one\n- two', [1])).toBe('- one\n- two')
  })

  it('stops counting where the list stops', () => {
    expect(of('1. one\n1. two\n\nplain\n\n1. other', [1])).toBe(
      '1. one\n2. two\n\nplain\n\n1. other',
    )
  })
})
