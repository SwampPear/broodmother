'use client'

import { useEffect, useRef, useState } from 'react'
import type { Profile } from '../profiles'
import { Icon } from './icons'

const logo = <img className="logo" src="/logo.png" alt="" width={20} height={20} />

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
  const root = useRef<HTMLDivElement>(null)
  const active = profiles.find((profile) => profile.id === activeId) ?? profiles[0]

  useEffect(() => {
    if (!open) return
    const dismiss = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', dismiss)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', dismiss)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  if (!active) return <div className="tree-head profile">{logo}</div>

  return (
    <div className="tree-head profile" ref={root}>
      {logo}
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((was) => !was)}
      >
        <span
          className="swatch"
          style={{ background: active.presenceColor }}
          aria-hidden
        />
        <span className="name">{active.name}</span>
        <Icon name={open ? 'chevron-down' : 'chevron-right'} />
      </button>

      {open && (
        <ul role="listbox" aria-label="profiles">
          {profiles.map((profile) => (
            <li
              key={profile.id}
              role="option"
              aria-selected={profile.id === active.id}
              onClick={() => {
                setOpen(false)
                if (profile.id !== active.id) onSelect(profile.id)
              }}
            >
              <span
                className="swatch"
                style={{ background: profile.presenceColor }}
                aria-hidden
              />
              <span className="name">{profile.name}</span>
              <span className="who">{profile.gitAuthor.email}</span>
            </li>
          ))}
          <li
            role="option"
            aria-selected={false}
            className="manage"
            onClick={() => {
              setOpen(false)
              onManage()
            }}
          >
            Add a profile…
          </li>
        </ul>
      )}
    </div>
  )
}
