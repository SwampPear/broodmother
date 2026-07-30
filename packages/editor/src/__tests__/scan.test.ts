import { describe, expect, it } from 'vitest'
import { revealed, scan, type Span } from '../preview'

/** What the editor would hide with the cursor at `caret`, rendered back into the text. */
function hidden(text: string, caret = -1): string {
  const cursors: Span[] = caret < 0 ? [] : [{ from: caret, to: caret }]
  const marks = scan(text)
    .markers.filter((marker) => !revealed(marker.owner, cursors))
    .sort((a, b) => b.from - a.from)
  let out = text
  for (const mark of marks) out = out.slice(0, mark.from) + out.slice(mark.to)
  return out
}

const classes = (text: string) =>
  scan(text)
    .styled.map((style) => style.className)
    .sort()

describe('headings', () => {
  it('hides the hashes and the space after them', () => {
    expect(hidden('## Title')).toBe('Title')
  })

  it('shows them back when the cursor is on the line', () => {
    expect(hidden('## Title', 3)).toBe('## Title')
  })

  it('leaves a hash that is not a heading alone', () => {
    expect(hidden('a #tag here')).toBe('a #tag here')
  })

  it('styles the line by its level', () => {
    expect(classes('### Title')).toContain('md-h3')
  })
})

describe('emphasis', () => {
  it('hides the markers', () => {
    expect(hidden('a **bold** word')).toBe('a bold word')
    expect(hidden('a *thin* word')).toBe('a thin word')
    expect(hidden('a ~~gone~~ word')).toBe('a gone word')
  })

  it('reveals the pair the cursor is inside', () => {
    expect(hidden('a **bold** word', 5)).toBe('a **bold** word')
  })

  it('does not read bold as two italics', () => {
    expect(classes('**bold**')).toEqual(['md-strong'])
  })

  it('handles bold italic', () => {
    expect(hidden('***both***')).toBe('both')
  })

  it('leaves an asterisk inside a word alone', () => {
    expect(hidden('2 * 3 * 4')).toBe('2 * 3 * 4')
  })
})

describe('code', () => {
  it('hides the backticks and styles what is between them', () => {
    expect(hidden('use `npm run dev` here')).toBe('use npm run dev here')
    expect(classes('`code`')).toEqual(['md-code'])
  })

  /* A fence holds text that is not markdown, so nothing in it may be rewritten. */
  it('leaves everything inside a fence alone', () => {
    const text = '```js\nconst a = **2**\n# not a heading\n```'
    expect(hidden(text)).toBe(text)
  })

  it('leaves markdown inside inline code alone', () => {
    expect(hidden('`**not bold**`')).toBe('**not bold**')
  })

  it('survives a fence that was never closed', () => {
    const text = '```\n# still code'
    expect(hidden(text)).toBe(text)
  })

  /* The ``` lines are syntax, not code, so they go the way every other marker goes. */
  it('reports both fence lines to hide', () => {
    const text = '```python\nprint(1)\n```'
    const [fence] = scan(text).fences
    expect(text.slice(fence!.open.from, fence!.open.to)).toBe('```python')
    expect(text.slice(fence!.close!.from, fence!.close!.to)).toBe('```')
  })

  it('owns the whole block, so editing inside it brings the fences back', () => {
    const text = 'before\n```js\nlet a = 1\n```\nafter'
    const [fence] = scan(text).fences
    expect(revealed(fence!.owner, [{ from: 20, to: 20 }])).toBe(true)
    expect(revealed(fence!.owner, [{ from: 0, to: 0 }])).toBe(false)
  })

  it('leaves an unclosed fence with nothing to hide at the end', () => {
    const [fence] = scan('```\nstill typing').fences
    expect(fence!.close).toBeNull()
  })

  it('finds each of several fences', () => {
    expect(scan('```\na\n```\ntext\n```\nb\n```').fences).toHaveLength(2)
  })
})

describe('links', () => {
  it('hides the brackets and the target', () => {
    expect(hidden('see [the docs](https://example.com) now')).toBe('see the docs now')
  })

  it('hides the wiki brackets and keeps the target', () => {
    expect(hidden('see [[Risks]] now')).toBe('see Risks now')
  })

  it('shows the alias rather than the target', () => {
    expect(hidden('see [[Risks|the risks]] now')).toBe('see the risks now')
  })

  it('styles a wiki link so it reads as one', () => {
    expect(classes('[[Risks]]')).toEqual(['md-wikilink'])
  })

  it('reveals the whole link when the cursor is in it', () => {
    const text = 'see [[Risks]] now'
    expect(hidden(text, 7)).toBe(text)
  })
})

describe('lists', () => {
  it('styles the bullet without moving it', () => {
    expect(hidden('- an item')).toBe('- an item')
    expect(classes('- an item')).toContain('md-bullet')
  })

  it('marks a done task apart from an open one', () => {
    expect(classes('- [x] done')).toContain('md-task md-task-done')
    expect(classes('- [ ] open')).toContain('md-task')
  })

  /* The box is what a click has to land on, so where it is has to be exact. It is the
     bullet: one mark per item, where the dot would have been. */
  it('puts the box on the bullet, not on the brackets', () => {
    const text = '- [ ] open'
    const [task] = scan(text).tasks
    expect(text.slice(task!.box.from, task!.box.to)).toBe('-')
    expect(task!.done).toBe(false)
  })

  it('hides the brackets, so only the box shows', () => {
    expect(hidden('- [x] done')).toBe('- done')
  })

  it('does not draw a dot as well as a box', () => {
    expect(classes('- [x] done')).not.toContain('md-bullet')
    expect(classes('- a plain item')).toContain('md-bullet')
  })

  it('reports a checked box as done', () => {
    const [task] = scan('- [x] done').tasks
    expect(task!.done).toBe(true)
  })

  it('strikes the text of a done task and leaves an open one alone', () => {
    expect(classes('- [x] done')).toContain('md-done')
    expect(classes('- [ ] open')).not.toContain('md-done')
  })

  it('strikes only that task, not the line after it', () => {
    const [task] = scan('- [x] done\n- [ ] open').tasks
    expect('- [x] done\n- [ ] open'.slice(task!.text.from, task!.text.to)).toBe('done')
  })

  it('finds a box on every item of a list', () => {
    expect(scan('- [ ] one\n- [x] two\n- [ ] three').tasks).toHaveLength(3)
  })

  it('finds a task at an indent', () => {
    expect(scan('  - [x] nested').tasks).toHaveLength(1)
  })
})

describe('math', () => {
  it('collects display equations to draw', () => {
    expect(scan('$$\nx^2\n$$').blocks.map((block) => block.latex)).toEqual(['x^2'])
  })

  it('styles inline math rather than collecting it', () => {
    const found = scan('a $x^2$ b')
    expect(found.blocks).toEqual([])
    expect(found.styled.map((style) => style.className)).toContain('md-math-inline')
  })

  it('ignores a dollar inside a fence', () => {
    expect(scan('```\n$$\nx^2\n$$\n```').blocks).toEqual([])
  })
})

describe('tables', () => {
  const simple = '| a | b |\n| --- | --- |\n| 1 | 2 |'

  it('reads the header, the body and the span it covers', () => {
    const [table] = scan(simple).tables
    expect(table!.header).toEqual(['a', 'b'])
    expect(table!.rows).toEqual([['1', '2']])
    expect(simple.slice(table!.from, table!.to)).toBe(simple)
  })

  it('reads the alignment out of the delimiter row', () => {
    const [table] = scan('| a | b | c |\n| :-- | :-: | --: |\n| 1 | 2 | 3 |').tables
    expect(table!.align).toEqual(['left', 'center', 'right'])
  })

  it('leaves alignment unset where the row says nothing', () => {
    expect(scan(simple).tables[0]!.align).toEqual([null, null])
  })

  /* Without the row of dashes it is a line with pipes in it, which is just text. */
  it('is not a table without a delimiter row', () => {
    expect(scan('| a | b |\n| 1 | 2 |').tables).toEqual([])
  })

  it('is not a table when the delimiter row is a different width', () => {
    expect(scan('| a | b |\n| --- |\n| 1 | 2 |').tables).toEqual([])
  })

  it('stops at the blank line after it', () => {
    const text = `${simple}\n\nafter`
    const [table] = scan(text).tables
    expect(text.slice(table!.from, table!.to)).toBe(simple)
  })

  it('takes a table with no body rows', () => {
    const [table] = scan('| a |\n| --- |').tables
    expect(table!.rows).toEqual([])
  })

  it('keeps an escaped pipe as content rather than a column break', () => {
    const [table] = scan('| a | b |\n| --- | --- |\n| x \\| y | 2 |').tables
    expect(table!.rows[0]).toEqual(['x | y', '2'])
  })

  it('ignores a table inside a fence', () => {
    expect(scan('```\n| a |\n| --- |\n```').tables).toEqual([])
  })

  it('finds two tables separated by prose', () => {
    expect(scan(`${simple}\n\ntext\n\n${simple}`).tables).toHaveLength(2)
  })
})

describe('quotes', () => {
  it('hides the marker and styles the line', () => {
    expect(hidden('> quoted')).toBe('quoted')
    expect(classes('> quoted')).toContain('md-quote')
  })
})
