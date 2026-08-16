// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { renderInline, scan } from '../preview'
import { insertColumn, TableWidget, type TableWidgetOptions } from '../table'

const only = (markdown: string) => {
  const { header, align, rows } = scan(markdown).tables[0]!
  return { header, align, rows }
}

const build = (markdown: string, options: Partial<TableWidgetOptions> = {}) =>
  new TableWidget({
    table: only(markdown),
    render: renderInline,
    apply: vi.fn(),
    remove: vi.fn(),
    revealSource: vi.fn(),
    exit: vi.fn(),
    relayout: vi.fn(),
    ...options,
  })

const text = (widget: TableWidget, selector: string) =>
  [...widget.host.querySelectorAll(selector)].map((cell) => cell.textContent)

const cellAt = (widget: TableWidget, selector: string, index = 0) => {
  const cell = [...widget.host.querySelectorAll(selector)][index]
  if (!(cell instanceof HTMLTableCellElement)) throw new Error(`no cell at ${selector}`)
  return cell
}

const press = (cell: HTMLElement, key: string, shiftKey = false) =>
  cell.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true }))

const click = (cell: HTMLElement) =>
  cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

describe('TableWidget rendering', () => {
  const widget = build('| a | b |\n| --- | --- |\n| 1 | 2 |')

  it('draws a real table rather than a grid of divs', () => {
    expect(widget.host.querySelector('table')).not.toBeNull()
    expect(widget.host.querySelector('thead')).not.toBeNull()
    expect(widget.host.querySelector('tbody')).not.toBeNull()
  })

  it('puts the header in the head and the body in the body', () => {
    expect(text(widget, 'th')).toEqual(['a', 'b'])
    expect(text(widget, 'tbody td')).toEqual(['1', '2'])
  })

  it('carries the alignment through to the cells', () => {
    const aligned = build('| a | b | c |\n| :-- | :-: | --: |\n| 1 | 2 | 3 |')
    const cells = [...aligned.host.querySelectorAll('tbody td')] as HTMLElement[]
    expect(cells.map((cell) => cell.style.textAlign)).toEqual(['left', 'center', 'right'])
  })

  /* A vault is a folder of files anyone can write into, so a cell is not a place to run
     one of them. */
  it('sets a cell as text, so markup in a note stays text', () => {
    const risky = build('| a |\n| --- |\n| <img src=x onerror=go> |')
    const cell = risky.host.querySelector('tbody td')!
    expect(cell.querySelector('img')).toBeNull()
    expect(cell.textContent).toBe('<img src=x onerror=go>')
  })

  it('fills a short row out to the width of the header', () => {
    const ragged = build('| a | b |\n| --- | --- |\n| 1 |')
    expect(text(ragged, 'tbody td')).toEqual(['1', ''])
  })

  it('widens the grid to a row that outgrew the header', () => {
    const wide = build('| a |\n| --- |\n| 1 | 2 |')
    expect(text(wide, 'th')).toEqual(['a', ''])
    expect(text(wide, 'tbody td')).toEqual(['1', '2'])
  })

  it('reads a cell as markdown, header and body alike', () => {
    const styled = build('| **a** |\n| --- |\n| `b` |')
    expect(text(styled, 'th')).toEqual(['a'])
    expect(text(styled, 'tbody td')).toEqual(['b'])
    expect(styled.host.querySelector('th span')!.className).toBe('md-strong')
    expect(styled.host.querySelector('tbody td span')!.className).toBe('md-code')
  })
})

describe('TableWidget height', () => {
  it('reports the frame as drawn, in whole pixels, and nothing while it is not laid out', () => {
    const widget = build('| a |\n| --- |\n| 1 |')
    const frame = widget.host.querySelector<HTMLElement>('.md-table-frame')!
    expect(widget.height).toBe(0)
    frame.getBoundingClientRect = () => ({ height: 41.2 }) as DOMRect
    expect(widget.height).toBe(42)
  })

  it('watches the frame rather than the host it was placed in', () => {
    const observed: Element[] = []
    const relayout = vi.fn()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private readonly callback: () => void) {}
        observe(target: Element) {
          observed.push(target)
          this.callback()
        }
        disconnect() {}
      },
    )
    try {
      build('| a |\n| --- |\n| 1 |', { relayout })
    } finally {
      vi.unstubAllGlobals()
    }
    expect(observed.map((one) => one.className)).toEqual(['md-table-frame'])
    expect(relayout).toHaveBeenCalled()
  })
})

describe('TableWidget editing', () => {
  it('opens a clicked cell as its raw markdown, editable', () => {
    const widget = build('| **a** |\n| --- |\n| 1 |')
    const cell = cellAt(widget, 'th')
    click(cell)
    expect(cell.getAttribute('contenteditable')).toBe('plaintext-only')
    expect(cell.textContent).toBe('**a**')
  })

  it('commits an edited cell on Tab and moves to the next', () => {
    const apply = vi.fn()
    const widget = build('| a | b |\n| --- | --- |\n| 1 | 2 |', { apply })
    const cell = cellAt(widget, 'th')
    click(cell)
    cell.textContent = 'renamed'
    press(cell, 'Tab')
    expect(apply).toHaveBeenCalledWith(
      expect.objectContaining({ header: ['renamed', 'b'] }),
    )
  })

  it('moves through cells on Tab without writing when nothing changed', () => {
    const apply = vi.fn()
    const widget = build('| a | b |\n| --- | --- |\n| 1 | 2 |', { apply })
    click(cellAt(widget, 'th'))
    press(cellAt(widget, 'th'), 'Tab')
    expect(apply).not.toHaveBeenCalled()
    expect(cellAt(widget, 'th', 1).getAttribute('contenteditable')).toBe('plaintext-only')
  })

  it('appends a row when Tab walks off the last cell', () => {
    const apply = vi.fn()
    const widget = build('| a |\n| --- |\n| 1 |', { apply })
    const last = cellAt(widget, 'tbody td')
    click(last)
    press(last, 'Tab')
    expect(apply).toHaveBeenCalledWith(expect.objectContaining({ rows: [['1'], ['']] }))
  })

  it('drops down a row on Enter, appending from the last one', () => {
    const apply = vi.fn()
    const widget = build('| a |\n| --- |\n| 1 |', { apply })
    const head = cellAt(widget, 'th')
    click(head)
    press(head, 'Enter')
    expect(apply).not.toHaveBeenCalled()
    expect(cellAt(widget, 'tbody td').getAttribute('contenteditable')).toBe(
      'plaintext-only',
    )
    press(cellAt(widget, 'tbody td'), 'Enter')
    expect(apply).toHaveBeenCalledWith(expect.objectContaining({ rows: [['1'], ['']] }))
  })

  it('walks out of the table when an arrow leaves the edge', () => {
    const exit = vi.fn()
    const widget = build('| a |\n| --- |\n| 1 |', { exit })
    const head = cellAt(widget, 'th')
    click(head)
    press(head, 'ArrowUp')
    expect(exit).toHaveBeenCalledWith('above')
    const last = cellAt(widget, 'tbody td')
    click(last)
    press(last, 'ArrowDown')
    expect(exit).toHaveBeenCalledWith('below')
  })

  it('throws an edit away on Escape', () => {
    const apply = vi.fn()
    const widget = build('| a |\n| --- |\n| 1 |', { apply })
    const cell = cellAt(widget, 'th')
    click(cell)
    cell.textContent = 'changed'
    press(cell, 'Escape')
    expect(apply).not.toHaveBeenCalled()
    expect(cell.getAttribute('contenteditable')).toBeNull()
    expect(cell.textContent).toBe('a')
  })

  it('keeps the cell being edited through an update from outside', () => {
    const widget = build('| a | b |\n| --- | --- |\n| 1 | 2 |')
    const cell = cellAt(widget, 'th')
    click(cell)
    cell.textContent = 'typing'
    widget.update({
      header: ['a', 'b'],
      align: [null, null],
      rows: [
        ['1', '2'],
        ['3', '4'],
      ],
    })
    expect(cellAt(widget, 'th')).toBe(cell)
    expect(cell.getAttribute('contenteditable')).toBe('plaintext-only')
    expect(cell.textContent).toBe('typing')
    expect(text(widget, 'tbody td')).toEqual(['1', '2', '3', '4'])
  })

  it('folds a structural change and an open edit into one write', () => {
    const apply = vi.fn()
    const widget = build('| a |\n| --- |\n| 1 |', { apply })
    const cell = cellAt(widget, 'th')
    click(cell)
    cell.textContent = 'renamed'
    widget.mutate((table) => insertColumn(table, 1))
    expect(apply).toHaveBeenCalledTimes(1)
    expect(apply).toHaveBeenCalledWith(
      expect.objectContaining({ header: ['renamed', ''], rows: [['1', '']] }),
    )
  })
})

describe('TableWidget menu', () => {
  const open = (widget: TableWidget, selector: string, index = 0) => {
    cellAt(widget, selector, index).dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true }),
    )
    const surface = document.querySelector('.menu-surface')
    if (!(surface instanceof HTMLElement)) throw new Error('menu did not open')
    return surface
  }

  const pick = (surface: HTMLElement, label: string) => {
    const item = [...surface.querySelectorAll('.menu-item')].find(
      (one) => one.textContent === label,
    )
    if (!item) throw new Error(`no item ${label}`)
    item.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }

  it('opens on right click with the table verbs', () => {
    const widget = build('| a | b |\n| --- | --- |\n| 1 | 2 |')
    const surface = open(widget, 'tbody td')
    const labels = [...surface.querySelectorAll('.menu-item')].map(
      (one) => one.textContent,
    )
    expect(labels).toContain('Insert row below')
    expect(labels).toContain('Move column right')
    expect(labels).toContain('Align center')
    expect(labels).toContain('Sort ascending')
    expect(labels).toContain('Edit as markdown')
    expect(labels).toContain('Delete table')
    surface.remove()
  })

  it('runs the op the row names and closes', () => {
    const apply = vi.fn()
    const widget = build('| a | b |\n| --- | --- |\n| 1 | 2 |', { apply })
    pick(open(widget, 'tbody td', 1), 'Align right')
    expect(document.querySelector('.menu-surface')).toBeNull()
    expect(apply).toHaveBeenCalledWith(
      expect.objectContaining({ align: [null, 'right'] }),
    )
  })

  it('deletes the whole table when the last column goes', () => {
    const remove = vi.fn()
    const widget = build('| a |\n| --- |\n| 1 |', { remove })
    pick(open(widget, 'tbody td'), 'Delete column')
    expect(remove).toHaveBeenCalled()
  })

  it('keeps the header undeletable', () => {
    const widget = build('| a |\n| --- |\n| 1 |')
    const surface = open(widget, 'th')
    const item = [...surface.querySelectorAll('.menu-item')].find(
      (one) => one.textContent === 'Delete row',
    )
    expect(item?.hasAttribute('data-disabled')).toBe(true)
    surface.remove()
  })

  it('adds a row and a column from the edge buttons', () => {
    const apply = vi.fn()
    const widget = build('| a |\n| --- |\n| 1 |', { apply })
    const row = widget.host.querySelector('.md-table-add-row')
    const column = widget.host.querySelector('.md-table-add-column')
    row?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(apply).toHaveBeenLastCalledWith(
      expect.objectContaining({ rows: [['1'], ['']] }),
    )
    column?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(apply).toHaveBeenLastCalledWith(expect.objectContaining({ header: ['a', ''] }))
  })
})

describe('renderInline', () => {
  const html = (source: string) => {
    const host = document.createElement('div')
    host.appendChild(renderInline(source))
    return host.innerHTML
  }

  const classesOf = (source: string) => {
    const host = document.createElement('div')
    host.appendChild(renderInline(source))
    return [...host.querySelectorAll('span')].map((span) => span.className)
  }

  it('drops the markers and keeps what they marked', () => {
    expect(html('**bold** and *thin*')).toBe(
      '<span class="md-strong">bold</span> and <span class="md-emphasis">thin</span>',
    )
  })

  it('styles the inline constructs a note is written with', () => {
    expect(classesOf('~~gone~~')).toEqual(['md-strike'])
    expect(classesOf('`code`')).toEqual(['md-code'])
    expect(classesOf('[text](http://a)')).toEqual(['md-link'])
    expect(classesOf('[[Note|alias]]')).toEqual(['md-wikilink'])
    expect(classesOf('$x^2$')).toEqual(['md-math-inline'])
  })

  it('shows an escaped character without its backslash', () => {
    expect(html('\\$5–10 and **\\$2,500**')).toBe(
      '$5–10 and <span class="md-strong">$2,500</span>',
    )
  })

  it('shows a link by its text and a wikilink by its alias', () => {
    expect(html('[text](http://a)')).toBe('<span class="md-link">text</span>')
    expect(html('[[Note|alias]]')).toBe('<span class="md-wikilink">alias</span>')
  })

  it('carries both classes through a run that is bold and italic at once', () => {
    expect(classesOf('***both***')).toEqual(['md-strong md-emphasis'])
  })

  /* A cell is a run inside a line, so what only means something at the start of one is
     text there. */
  it('leaves the line-level markers alone', () => {
    expect(html('# 1')).toBe('# 1')
    expect(html('- a')).toBe('- a')
    expect(html('> a')).toBe('&gt; a')
  })

  it('leaves markup in a note as markup nobody runs', () => {
    expect(html('<img src=x onerror=go>')).toBe('&lt;img src=x onerror=go&gt;')
  })
})
