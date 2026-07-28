import { SCHEMA_SPEC } from '@docs/shared'
import { Extension, type Editor, type Range } from '@tiptap/core'
import { Suggestion, type SuggestionProps } from '@tiptap/suggestion'

export interface SlashItem {
  title: string
  run: (editor: Editor, range: Range) => void
}

const at = (editor: Editor, range: Range) => editor.chain().deleteRange(range)

export const SLASH_ITEMS: SlashItem[] = [
  { title: 'Text', run: (e, r) => at(e, r).setParagraph().run() },
  ...SCHEMA_SPEC.headingLevels.map((level) => ({
    title: `Heading ${level}`,
    run: (e: Editor, r: Range) => at(e, r).setNode('heading', { level }).run(),
  })),
  { title: 'Bullet list', run: (e, r) => at(e, r).toggleBulletList().run() },
  { title: 'Numbered list', run: (e, r) => at(e, r).toggleOrderedList().run() },
  { title: 'Task list', run: (e, r) => at(e, r).toggleTaskList().run() },
  { title: 'Code block', run: (e, r) => at(e, r).toggleCodeBlock().run() },
  { title: 'Quote', run: (e, r) => at(e, r).toggleBlockquote().run() },
  {
    title: 'Table',
    run: (e, r) => at(e, r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  { title: 'Divider', run: (e, r) => at(e, r).setHorizontalRule().run() },
  { title: 'Image', run: (e, r) => at(e, r).setImage({ src: '' }).run() },
]

export interface SlashState {
  items: SlashItem[]
  index: number
  rect: DOMRect | null
}

export interface SlashMenuOptions {
  onChange: (state: SlashState | null) => void
}

export const SlashMenu = Extension.create<SlashMenuOptions>({
  name: 'slashMenu',
  /** Must see Enter and the arrows before the list and blockquote keymaps do. */
  priority: 1000,

  addOptions() {
    return { onChange: () => {} }
  },

  addProseMirrorPlugins() {
    let menu: SlashState | null = null
    let select: ((item: SlashItem) => void) | null = null
    const emit = () => this.options.onChange(menu)
    const open = (props: SuggestionProps<SlashItem, SlashItem>) => {
      menu = { items: props.items, index: 0, rect: props.clientRect?.() ?? null }
      select = props.command
      emit()
    }

    return [
      Suggestion<SlashItem, SlashItem>({
        editor: this.editor,
        char: '/',
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from)
          return $from.parent.type.name === 'paragraph' && range.from === $from.start()
        },
        items: ({ query }) =>
          SLASH_ITEMS.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase()),
          ),
        command: ({ editor, range, props }) => props.run(editor, range),
        render: () => ({
          onStart: open,
          onUpdate: open,
          onExit: () => {
            menu = null
            select = null
            emit()
          },
          onKeyDown: ({ event }) => {
            if (!menu?.items.length) return false
            const step = { ArrowDown: 1, ArrowUp: menu.items.length - 1 }[event.key]
            if (step !== undefined) {
              menu = { ...menu, index: (menu.index + step) % menu.items.length }
              emit()
              return true
            }
            if (event.key === 'Enter') {
              select?.(menu.items[menu.index])
              return true
            }
            return false
          },
        }),
      }),
    ]
  },
})
