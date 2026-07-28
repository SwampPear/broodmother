import { InputRule, Node } from '@tiptap/core'

/**
 * Both nodes hold their LaTeX as verbatim text, like `codeBlock`: `code` and `whitespace`
 * keep it out of reach of input rules, marks and whitespace collapsing.
 */
const verbatim = { content: 'text*', marks: '', code: true, whitespace: 'pre' } as const

/** `$…$`, inside a sentence. */
export const Math = Node.create({
  name: 'math',
  inline: true,
  group: 'inline',
  ...verbatim,

  parseHTML() {
    return [{ tag: 'span[data-math]', preserveWhitespace: 'full' }]
  },

  renderHTML() {
    return ['span', { 'data-math': '' }, 0]
  },

  addInputRules() {
    return [
      new InputRule({
        find: /(?<!\$)\$([^$\n]+)\$$/,
        handler: ({ state, range, match }) => {
          state.tr.replaceWith(
            range.from,
            range.to,
            this.type.create(null, state.schema.text(match[1])),
          )
        },
      }),
    ]
  },
})

/** `$$…$$`, a block of its own, sibling to `codeBlock`. */
export const MathBlock = Node.create({
  name: 'mathBlock',
  group: 'block',
  defining: true,
  ...verbatim,

  parseHTML() {
    return [{ tag: 'div[data-math-block]', preserveWhitespace: 'full' }]
  },

  renderHTML() {
    return ['div', { 'data-math-block': '' }, 0]
  },

  addInputRules() {
    return [
      new InputRule({
        find: /^\$\$([^$\n]+)\$\$$/,
        handler: ({ state, range, match }) => {
          state.tr
            .delete(range.from, range.to)
            .setBlockType(range.from, range.from, this.type)
            .insertText(match[1], range.from)
        },
      }),
    ]
  },
})
