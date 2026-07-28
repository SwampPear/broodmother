'use client'

import { useMemo } from 'react'
import { Editor as BlockEditor } from '@docs/editor'
import { parse, serialize } from '@docs/markdown'

/** The app stores markdown, the editor speaks trees. This is the only seam between them. */
export function Editor({
  markdown,
  onChange,
}: {
  markdown: string
  onChange: (markdown: string) => void
}) {
  const value = useMemo(() => parse(markdown), [markdown])
  return <BlockEditor value={value} onChange={(doc) => onChange(serialize(doc))} />
}
