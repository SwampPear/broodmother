'use client'

import type { ReactNode } from 'react'

/**
 * A settings panel opens on what it is for rather than on its own name: the rail beside it
 * already says which section you are in, and a heading that repeats it costs a line and a
 * rule to say nothing. What is left is the sentence, then the fields.
 */
export function Panel({ hint, children }: { hint: string; children: ReactNode }) {
  return (
    <div className="settings-panel">
      <p className="hint">{hint}</p>
      {children}
    </div>
  )
}

/**
 * What belongs to the thing the panel is about but is not the thing itself: the key is the
 * profile's, the sync is the vault's. A rule and a heading rather than a page of its own.
 *
 * `danger` is for what cannot be taken back. It turns the heading and the rule under it red
 * and does nothing else — a section that is already coloured does not also need a box.
 */
export function Section({
  title,
  danger = false,
  children,
}: {
  title: string
  danger?: boolean
  children: ReactNode
}) {
  return (
    <section className={danger ? 'settings-section danger-zone' : 'settings-section'}>
      <h3>{title}</h3>
      {children}
    </section>
  )
}
