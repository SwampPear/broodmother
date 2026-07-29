import { isInlineMath } from '@broodmother/shared'
import { WidgetType } from '@codemirror/view'
import katex from 'katex'

export interface MathSpan {
  from: number
  to: number
  latex: string
  block: boolean
}

/** Rendered as a widget when the cursor is elsewhere, raw source the moment it isn't. */
export class MathWidget extends WidgetType {
  constructor(
    readonly latex: string,
    readonly block: boolean,
  ) {
    super()
  }

  eq(other: MathWidget) {
    return other.latex === this.latex && other.block === this.block
  }

  toDOM() {
    const host = document.createElement(this.block ? 'div' : 'span')
    host.className = this.block ? 'cm-math cm-math-block' : 'cm-math'
    katex.render(this.latex, host, {
      throwOnError: false,
      displayMode: this.block,
      output: 'htmlAndMathml',
    })
    return host
  }

  /** Let clicks through so putting the cursor in an equation opens its source. */
  ignoreEvent() {
    return false
  }
}

/**
 * `$$…$$` first, so a display equation is never mistaken for two inline ones. Both forms
 * are found by scanning rather than by the markdown grammar, which keeps multi-line
 * display math working and leaves the parser untouched.
 */
export function findMath(text: string, offset = 0): MathSpan[] {
  const spans: MathSpan[] = []
  let index = 0

  while (index < text.length) {
    const dollar = text.indexOf('$', index)
    if (dollar < 0) break

    if (text.startsWith('$$', dollar)) {
      const close = text.indexOf('$$', dollar + 2)
      if (close < 0) break
      const latex = text.slice(dollar + 2, close)
      if (latex.trim()) {
        spans.push({
          from: offset + dollar,
          to: offset + close + 2,
          latex: latex.trim(),
          block: true,
        })
      }
      index = close + 2
      continue
    }

    const close = text.indexOf('$', dollar + 1)
    const body = close < 0 ? '' : text.slice(dollar + 1, close)
    if (close > 0 && !body.includes('\n') && isInlineMath(body, text[close + 1] ?? '')) {
      spans.push({
        from: offset + dollar,
        to: offset + close + 1,
        latex: body,
        block: false,
      })
      index = close + 1
      continue
    }
    index = dollar + 1
  }

  return spans
}
