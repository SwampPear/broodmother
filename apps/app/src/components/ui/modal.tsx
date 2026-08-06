'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useId, type ReactNode } from 'react'
import { Icon } from './icons'

/**
 * Every modal in the app is this component: a dimmed ground, a panel with a titled header,
 * a scrolling body, and a footer that holds the actions. Passing `onClose` is what makes it
 * dismissable — a modal that must be answered leaves it out, and then there is no close
 * button, no escape, and no click-away.
 *
 * Mounting it opens it, so callers keep the open/closed decision in their own state rather
 * than mirroring it here. Focus trapping, the return of focus on close, the scroll lock and
 * the inert background come from the same headless primitive the menus use.
 */
export function Modal({
  title,
  description,
  size = 'medium',
  onClose,
  footer,
  children,
}: {
  title: string
  description?: string
  size?: 'small' | 'medium' | 'large'
  onClose?: () => void
  footer?: ReactNode
  children: ReactNode
}) {
  const said = useId()
  const stay = (event: Event) => !onClose && event.preventDefault()

  return (
    <Dialog.Root open onOpenChange={(next) => !next && onClose?.()}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-ground" />
        <Dialog.Content
          className="modal"
          data-size={size}
          aria-describedby={description ? said : undefined}
          onEscapeKeyDown={stay}
          onPointerDownOutside={stay}
          onInteractOutside={stay}
        >
          <header className="modal-head">
            <Dialog.Title>{title}</Dialog.Title>
            {onClose && (
              <Dialog.Close className="modal-close" aria-label="Close">
                <Icon name="x" />
              </Dialog.Close>
            )}
          </header>
          {description && (
            <Dialog.Description className="modal-description" id={said}>
              {description}
            </Dialog.Description>
          )}
          <div className="modal-body">{children}</div>
          {footer && <div className="modal-foot">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
