import { describe, expect, it } from 'vitest'
import { scan } from '../preview'
import {
  deleteColumn,
  deleteRow,
  insertColumn,
  insertRow,
  moveColumn,
  moveRow,
  normalize,
  serializeTable,
  setColumnAlign,
  sortByColumn,
  type TableData,
} from '../table'

const grid: TableData = {
  header: ['a', 'b'],
  align: [null, null],
  rows: [
    ['1', '2'],
    ['3', '4'],
  ],
}

const asData = (markdown: string): TableData => {
  const { header, align, rows } = scan(markdown).tables[0]!
  return { header, align, rows }
}

describe('serializeTable', () => {
  it('writes compact pipes a scan reads back unchanged', () => {
    const source = serializeTable(grid)
    expect(source).toBe('| a | b |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |')
    expect(asData(source)).toEqual(grid)
  })

  it('carries every alignment through a roundtrip', () => {
    const aligned: TableData = {
      header: ['a', 'b', 'c', 'd'],
      align: ['left', 'center', 'right', null],
      rows: [['1', '2', '3', '4']],
    }
    expect(asData(serializeTable(aligned))).toEqual(aligned)
  })

  it('escapes a pipe in a cell and reads it back as content', () => {
    const piped: TableData = { header: ['a'], align: [null], rows: [['x | y']] }
    expect(serializeTable(piped)).toContain('x \\| y')
    expect(asData(serializeTable(piped))).toEqual(piped)
  })
})

describe('normalize', () => {
  it('pads ragged rows and the header out to the widest line', () => {
    const ragged: TableData = { header: ['a'], align: [null], rows: [['1', '2']] }
    expect(normalize(ragged)).toEqual({
      header: ['a', ''],
      align: [null, null],
      rows: [['1', '2']],
    })
  })
})

describe('row ops', () => {
  it('inserts a blank row where asked', () => {
    expect(insertRow(grid, 1).rows).toEqual([
      ['1', '2'],
      ['', ''],
      ['3', '4'],
    ])
  })

  it('deletes the row at the index', () => {
    expect(deleteRow(grid, 0).rows).toEqual([['3', '4']])
  })

  it('moves a row rather than swapping it', () => {
    const three = { ...grid, rows: [...grid.rows, ['5', '6']] }
    expect(moveRow(three, 0, 2).rows).toEqual([
      ['3', '4'],
      ['5', '6'],
      ['1', '2'],
    ])
  })
})

describe('column ops', () => {
  it('inserts a blank column through header, alignment and body', () => {
    const wider = insertColumn(setColumnAlign(grid, 1, 'right'), 1)
    expect(wider.header).toEqual(['a', '', 'b'])
    expect(wider.align).toEqual([null, null, 'right'])
    expect(wider.rows).toEqual([
      ['1', '', '2'],
      ['3', '', '4'],
    ])
  })

  it('deletes a column through header, alignment and body', () => {
    const narrower = deleteColumn(setColumnAlign(grid, 0, 'center'), 0)
    expect(narrower.header).toEqual(['b'])
    expect(narrower.align).toEqual([null])
    expect(narrower.rows).toEqual([['2'], ['4']])
  })

  it('moves a column with its alignment', () => {
    const moved = moveColumn(setColumnAlign(grid, 0, 'right'), 0, 1)
    expect(moved.header).toEqual(['b', 'a'])
    expect(moved.align).toEqual([null, 'right'])
    expect(moved.rows).toEqual([
      ['2', '1'],
      ['4', '3'],
    ])
  })

  it('sets and clears one column alignment', () => {
    expect(setColumnAlign(grid, 1, 'center').align).toEqual([null, 'center'])
    expect(setColumnAlign(setColumnAlign(grid, 1, 'center'), 1, null).align).toEqual([
      null,
      null,
    ])
  })
})

describe('sortByColumn', () => {
  it('sorts numbers as numbers', () => {
    const numbers = {
      ...grid,
      rows: [
        ['10', ''],
        ['9', ''],
        ['2', ''],
      ],
    }
    expect(sortByColumn(numbers, 0, 'asc').rows.map((row) => row[0])).toEqual([
      '2',
      '9',
      '10',
    ])
  })

  it('sorts words as words, either direction', () => {
    const words = {
      ...grid,
      rows: [
        ['pear', ''],
        ['apple', ''],
        ['fig', ''],
      ],
    }
    expect(sortByColumn(words, 0, 'asc').rows.map((row) => row[0])).toEqual([
      'apple',
      'fig',
      'pear',
    ])
    expect(sortByColumn(words, 0, 'desc').rows.map((row) => row[0])).toEqual([
      'pear',
      'fig',
      'apple',
    ])
  })

  it('falls back to words when any cell is not a number', () => {
    const mixed = {
      ...grid,
      rows: [
        ['10', ''],
        ['x', ''],
        ['2', ''],
      ],
    }
    expect(sortByColumn(mixed, 0, 'asc').rows.map((row) => row[0])).toEqual([
      '10',
      '2',
      'x',
    ])
  })
})
