'use client'

import { useEffect, useRef, useState, type DragEvent } from 'react'
import { basename, type VaultEntry, type VaultPath } from '@broodmother/shared'
import { dropFolder, movable } from './paths'

const SPRING_MS = 600

export interface TreeDrag {
  dragging: VaultPath | null
  /** The vault root is the empty path, so null is the only value meaning no target. */
  target: VaultPath | null
  start(event: DragEvent, path: VaultPath): void
  overRow(event: DragEvent, entry: VaultEntry): void
  overRoot(event: DragEvent): void
  leaveList(event: DragEvent): void
  drop(event: DragEvent, folder: VaultPath): void
  end(): void
}

export function useTreeDrag({
  expanded,
  onExpand,
  onMove,
}: {
  expanded: Set<VaultPath>
  onExpand: (path: VaultPath) => void
  onMove: (from: VaultPath, to: VaultPath) => void
}): TreeDrag {
  const [dragging, setDragging] = useState<VaultPath | null>(null)
  const [target, setTarget] = useState<VaultPath | null>(null)
  const spring = useRef<{ path: VaultPath; timer: ReturnType<typeof setTimeout> } | null>(
    null,
  )

  function cancelSpring() {
    if (spring.current) clearTimeout(spring.current.timer)
    spring.current = null
  }

  // A drag can end outside the window, where no event arrives to cancel the timer.
  useEffect(() => cancelSpring, [])

  function armSpring(entry: VaultEntry) {
    const shut =
      entry.kind === 'dir' && !expanded.has(entry.path) && entry.path !== dragging
    if (!shut) return cancelSpring()
    if (spring.current?.path === entry.path) return
    cancelSpring()
    spring.current = {
      path: entry.path,
      timer: setTimeout(() => {
        spring.current = null
        onExpand(entry.path)
      }, SPRING_MS),
    }
  }

  function end() {
    cancelSpring()
    setDragging(null)
    setTarget(null)
  }

  // The browser allows a drop only where the default was prevented.
  function claim(event: DragEvent, from: VaultPath, folder: VaultPath) {
    if (!movable(from, folder)) return setTarget(null)
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setTarget(folder)
  }

  return {
    dragging,
    target,

    start(event, path) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', path)
      setDragging(path)
    },

    overRow(event, entry) {
      if (dragging === null) return
      // The list underneath is the root target; the row with the pointer answers instead.
      event.stopPropagation()
      armSpring(entry)
      claim(event, dragging, dropFolder(entry))
    },

    overRoot(event) {
      if (dragging !== null) claim(event, dragging, '')
    },

    // Drag-leave also fires stepping from a row onto one of its own spans.
    leaveList(event) {
      const to = event.relatedTarget
      if (to instanceof Node && event.currentTarget.contains(to)) return
      cancelSpring()
      setTarget(null)
    },

    drop(event, folder) {
      event.preventDefault()
      event.stopPropagation()
      // State carries a same-window drag; the transfer survives one from elsewhere.
      const from = dragging ?? event.dataTransfer.getData('text/plain')
      end()
      if (!from || !movable(from, folder)) return
      onMove(from, folder ? `${folder}/${basename(from)}` : basename(from))
    },

    end,
  }
}
