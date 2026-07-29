'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Profile } from '../profiles'
import { Icon } from './icons'

const logo = <img className="logo" src="/logo.png" alt="" width={20} height={20} />

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || '?'

export function ProfileMenu({
  profiles,
  activeId,
  onSelect,
  onManage,
}: {
  profiles: Profile[]
  activeId: string
  onSelect: (id: string) => void
  onManage: () => void
}) {
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const active = profiles.find((profile) => profile.id === activeId) ?? profiles[0]

  useEffect(() => {
    if (!open) return
    const dismiss = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', dismiss)
    return () => document.removeEventListener('mousedown', dismiss)
  }, [open])

  // Focus moves to the list so arrows work the moment it opens, with the row you are
  // already on under the cursor rather than the top of the list.
  useEffect(() => {
    if (!open) return
    setCursor(Math.max(0, profiles.findIndex((profile) => profile.id === active?.id)))
    list.current?.focus()
  }, [open, profiles, active?.id])

  if (!active) return <div className="tree-head profile">{logo}</div>

  const rows = profiles.length + 1 // the trailing "add" row is selectable too
  const choose = (index: number) => {
    setOpen(false)
    if (index >= profiles.length) return onManage()
    const picked = profiles[index]!
    if (picked.id !== active.id) onSelect(picked.id)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    const keys: Record<string, () => void> = {
      Escape: () => setOpen(false),
      ArrowDown: () => setCursor((at) => (at + 1) % rows),
      ArrowUp: () => setCursor((at) => (at - 1 + rows) % rows),
      Home: () => setCursor(0),
      End: () => setCursor(rows - 1),
      Enter: () => choose(cursor),
      ' ': () => choose(cursor),
    }
    const handler = keys[event.key]
    if (!handler) return
    event.preventDefault()
    handler()
  }

  return (
    <div className="tree-head profile" ref={root}>
      {logo}
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((was) => !was)}
        onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
      >
        <span className="avatar" style={{ background: active.presenceColor }} aria-hidden>
          {initial(active.name)}
        </span>
        <span className="name">{active.name}</span>
        <Icon name="chevrons-up-down" />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="profiles"
          aria-activedescendant={`profile-row-${cursor}`}
          tabIndex={-1}
          ref={list}
          onKeyDown={onKeyDown}
        >
          <li className="section" role="presentation">
            Profiles
          </li>
          {profiles.map((profile, index) => (
            <li
              key={profile.id}
              id={`profile-row-${index}`}
              role="option"
              aria-selected={profile.id === active.id}
              data-cursor={index === cursor || undefined}
              onMouseEnter={() => setCursor(index)}
              onClick={() => choose(index)}
            >
              <span
                className="avatar"
                style={{ background: profile.presenceColor }}
                aria-hidden
              >
                {initial(profile.name)}
              </span>
              <span className="identity">
                <span className="name">{profile.name}</span>
                <span className="who">{profile.gitAuthor.email}</span>
              </span>
              {profile.id === active.id && <Icon name="check" />}
            </li>
          ))}
          <li
            id={`profile-row-${profiles.length}`}
            role="option"
            aria-selected={false}
            className="manage"
            data-cursor={cursor === profiles.length || undefined}
            onMouseEnter={() => setCursor(profiles.length)}
            onClick={() => choose(profiles.length)}
          >
            <Icon name="plus" />
            Add a profile…
          </li>
        </ul>
      )}
    </div>
  )
}
