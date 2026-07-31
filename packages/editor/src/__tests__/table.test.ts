// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { renderInline, renderTable, scan, type Table } from '../preview'

const only = (markdown: string): Table => scan(markdown).tables[0]!

const text = (element: HTMLElement, selector: string) =>
  [...element.querySelectorAll(selector)].map((cell) => cell.textContent)

describe('renderTable', () => {
  const table = renderTable(only('| a | b |\n| --- | --- |\n| 1 | 2 |'))

  it('draws a real table rather than a grid of divs', () => {
    expect(table.tagName).toBe('TABLE')
    expect(table.querySelector('thead')).not.toBeNull()
    expect(table.querySelector('tbody')).not.toBeNull()
  })

  it('puts the header in the head and the body in the body', () => {
    expect(text(table, 'th')).toEqual(['a', 'b'])
    expect(text(table, 'tbody td')).toEqual(['1', '2'])
  })

  it('carries the alignment through to the cells', () => {
    const aligned = renderTable(only('| a | b | c |\n| :-- | :-: | --: |\n| 1 | 2 | 3 |'))
    const cells = [...aligned.querySelectorAll('tbody td')] as HTMLElement[]
    expect(cells.map((cell) => cell.style.textAlign)).toEqual(['left', 'center', 'right'])
  })

  /* A vault is a folder of files anyone can write into, so a cell is not a place to run
     one of them. */
  it('sets a cell as text, so markup in a note stays text', () => {
    const risky = renderTable(only('| a |\n| --- |\n| <img src=x onerror=go> |'))
    const cell = risky.querySelector('tbody td')!
    expect(cell.querySelector('img')).toBeNull()
    expect(cell.textContent).toBe('<img src=x onerror=go>')
  })

  it('fills a short row out to the width of the header', () => {
    const ragged = renderTable(only('| a | b |\n| --- | --- |\n| 1 |'))
    expect(text(ragged, 'tbody td')).toEqual(['1', ''])
  })

  it('reads a cell as markdown, header and body alike', () => {
    const styled = renderTable(only('| **a** |\n| --- |\n| `b` |'))
    expect(text(styled, 'th')).toEqual(['a'])
    expect(text(styled, 'tbody td')).toEqual(['b'])
    expect(styled.querySelector('th span')!.className).toBe('md-strong')
    expect(styled.querySelector('tbody td span')!.className).toBe('md-code')
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
