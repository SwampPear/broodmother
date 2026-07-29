// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { renderTable } from '../preview'
import { scan, type Table } from '../scan'

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
})
