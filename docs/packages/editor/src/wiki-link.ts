import { InputRule, Mark } from '@tiptap/core'

export const wikiLinkInputRegex = /\[\[([^[\]|\n]+)(?:\|([^[\]\n]+))?\]\]$/

export const WikiLink = Mark.create({
  name: 'wikiLink',
  inclusive: false,

  addAttributes() {
    return {
      target: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-wiki-link'),
        renderHTML: (attributes) => ({ 'data-wiki-link': attributes.target }),
      },
      alias: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-wiki-alias'),
        renderHTML: (attributes) =>
          attributes.alias ? { 'data-wiki-alias': attributes.alias } : {},
      },
    }
  },

  parseHTML() {
    return [{ tag: 'a[data-wiki-link]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['a', HTMLAttributes, 0]
  },

  addInputRules() {
    return [
      new InputRule({
        find: wikiLinkInputRegex,
        handler: ({ state, range, match }) => {
          const [, target, alias] = match
          state.tr.replaceWith(
            range.from,
            range.to,
            state.schema.text(alias ?? target, [
              this.type.create({ target, alias: alias ?? null }),
            ]),
          )
        },
      }),
    ]
  },
})
