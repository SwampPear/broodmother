'use client'

/**
 * `@docs/editor` (plan 02) is still an empty stub, so this stands in for it. When it
 * lands, the body below becomes `export { Editor } from '@docs/editor'` — nothing else in
 * the app imports the editor.
 */
export function Editor({
  markdown,
  onChange,
}: {
  markdown: string
  onChange: (markdown: string) => void
}) {
  return (
    <textarea
      className="editor"
      aria-label="document"
      spellCheck={false}
      value={markdown}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
