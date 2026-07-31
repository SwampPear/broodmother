'use client'

import * as Context from '@radix-ui/react-context-menu'
import type { ReactNode } from 'react'
import { MenuRow, type MenuSection } from './menu'

/**
 * The same rows as the dropdown, opened by the right button on the thing they act on
 * rather than by a control that stands for it. Sections and styling are shared with
 * `Menu`; only the anchor differs, and the primitive underneath handles it.
 */
export function ContextMenu({
  label,
  sections,
  children,
}: {
  label: string
  sections: MenuSection[]
  children: ReactNode
}) {
  return (
    <Context.Root>
      <Context.Trigger asChild>{children}</Context.Trigger>
      <Context.Portal>
        <Context.Content
          className="menu-surface"
          aria-label={label}
          collisionPadding={8}
          loop
        >
          {sections.map((section, index) => (
            <div className="menu-section" key={section.heading ?? index}>
              {section.heading && (
                <Context.Label className="menu-heading">{section.heading}</Context.Label>
              )}
              {section.actions.map((action) => (
                <Context.Item
                  key={action.id}
                  className="menu-item"
                  disabled={action.disabled}
                  data-danger={action.danger || undefined}
                  onSelect={action.onSelect}
                >
                  <MenuRow action={action} />
                </Context.Item>
              ))}
            </div>
          ))}
        </Context.Content>
      </Context.Portal>
    </Context.Root>
  )
}
