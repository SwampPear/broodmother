import { InputRule } from '@tiptap/core'
import { TaskItem as BaseTaskItem } from '@tiptap/extension-list'

/**
 * Upstream handles a bare `[ ] `. The full markdown `- [ ] ` lands inside the bullet list
 * the `- ` just made, where upstream's wrapping rule can't apply — so convert that
 * one-item list instead.
 */
export const TaskItem = BaseTaskItem.configure({ nested: true }).extend({
  addInputRules() {
    return [
      ...(this.parent?.() ?? []),
      new InputRule({
        find: /^\[([ x])?\]\s$/,
        handler: ({ state, range, match }) => {
          const $start = state.doc.resolve(range.from)
          if ($start.depth < 3) return null
          const list = $start.node(-2)
          if (list.type.name !== 'bulletList' || list.childCount !== 1) return null
          if ($start.node(-1).childCount !== 1) return null

          const item = this.type.create(
            { checked: match[1] === 'x' },
            $start.parent.copy($start.parent.content.cut(range.to - range.from)),
          )
          state.tr.replaceWith(
            $start.before(-2),
            $start.after(-2),
            state.schema.nodes.taskList.create(null, item),
          )
        },
      }),
    ]
  },
})
