'use client'

import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react'

const STEP = 16

/** The sidebar grows with the pointer; the terminal panel grows against it, hence `-y`. */
const AXES = {
  sidebar: {
    min: 180,
    max: 520,
    initial: 272,
    orientation: 'vertical',
    label: 'resize sidebar',
    along: (event: { clientX: number; clientY: number }) => event.clientX,
    keys: { ArrowLeft: -1, ArrowRight: 1 } as Record<string, number>,
  },
  panel: {
    min: 120,
    max: 720,
    initial: 288,
    orientation: 'horizontal',
    label: 'resize terminal',
    along: (event: { clientX: number; clientY: number }) => -event.clientY,
    keys: { ArrowUp: 1, ArrowDown: -1 } as Record<string, number>,
  },
} as const

export type Axis = keyof typeof AXES

export const initialSize = (axis: Axis): number => AXES[axis].initial

const clampSize = (axis: Axis, size: number) =>
  Math.min(AXES[axis].max, Math.max(AXES[axis].min, size))

/** A pane size that outlives the window. Clamped on the way in too: the stored number may
 *  come from a version of the app that allowed a width this one does not. */
export function useStoredSize(axis: Axis, key: string): [number, (size: number) => void] {
  const [size, setSize] = useState(() => initialSize(axis))

  // After mount, not during render: the server has no localStorage to hydrate from.
  useEffect(() => {
    const stored = Number(localStorage.getItem(key))
    if (stored) setSize(clampSize(axis, stored))
  }, [axis, key])

  function store(next: number) {
    setSize(next)
    localStorage.setItem(key, String(next))
  }

  return [size, store]
}

export function Resizer({
  axis,
  size,
  onSize,
}: {
  axis: Axis
  size: number
  onSize: (size: number) => void
}) {
  const spec = AXES[axis]
  const [dragging, setDragging] = useState(false)
  const start = useRef({ at: 0, size })

  useEffect(() => {
    if (!dragging) return
    document.body.dataset.resizing = axis
    return () => {
      delete document.body.dataset.resizing
    }
  }, [dragging, axis])

  const down = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId)
    start.current = { at: spec.along(event), size }
    setDragging(true)
  }

  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging)
      onSize(clampSize(axis, start.current.size + spec.along(event) - start.current.at))
  }

  const up = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    setDragging(false)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const direction = spec.keys[event.key]
    if (direction === undefined) return
    event.preventDefault()
    onSize(clampSize(axis, size + direction * STEP))
  }

  return (
    <div
      className="resizer"
      data-axis={axis}
      role="separator"
      aria-orientation={spec.orientation}
      aria-label={spec.label}
      aria-valuenow={size}
      aria-valuemin={spec.min}
      aria-valuemax={spec.max}
      tabIndex={0}
      data-dragging={dragging || undefined}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onDoubleClick={() => onSize(spec.initial)}
      onKeyDown={onKeyDown}
    />
  )
}
