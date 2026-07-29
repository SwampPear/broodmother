import { describe, expect, it } from 'vitest'
import { findMath } from '../math'

const latex = (source: string) => findMath(source).map((span) => span.latex)

describe('findMath', () => {
  it('takes `$…$` inside a sentence', () => {
    expect(findMath('the term $x^2$ here')).toEqual([
      { from: 9, to: 14, latex: 'x^2', block: false },
    ])
  })

  it('takes `$$…$$` as a display block', () => {
    expect(findMath('$$E = mc^2$$')).toEqual([
      { from: 0, to: 12, latex: 'E = mc^2', block: true },
    ])
  })

  it('spans lines in a display block', () => {
    expect(latex('$$\n\\frac{a}{b}\n$$')).toEqual(['\\frac{a}{b}'])
  })

  it('leaves prices alone', () => {
    expect(findMath('raising $289k–$1.25M this round')).toEqual([])
  })

  it('refuses delimiters that do not hug their content', () => {
    expect(findMath('$ x $')).toEqual([])
  })

  it('reads a display block before the inline pair inside it', () => {
    expect(latex('$$a$$ and $b$')).toEqual(['a', 'b'])
  })

  it('ignores an unclosed delimiter', () => {
    expect(findMath('costs $5 and')).toEqual([])
  })
})
