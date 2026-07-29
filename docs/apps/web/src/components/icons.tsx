import type { ReactNode } from 'react'

export type IconName =
  | 'file'
  | 'file-text'
  | 'file-music'
  | 'image'
  | 'layout-dashboard'
  | 'chevron-right'
  | 'chevron-down'

/** Lucide, the set Obsidian ships: 24×24, stroke 2, round caps and joins. */
const GLYPHS: Record<IconName, ReactNode> = {
  file: (
    <>
      <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
      <path d="M14 2v5a1 1 0 0 0 1 1h5" />
    </>
  ),
  'file-text': (
    <>
      <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
      <path d="M14 2v5a1 1 0 0 0 1 1h5" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </>
  ),
  'file-music': (
    <>
      <path d="M11.65 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v10.35" />
      <path d="M14 2v5a1 1 0 0 0 1 1h5" />
      <path d="M8 20v-7l3 1.474" />
      <circle cx="6" cy="20" r="2" />
    </>
  ),
  image: (
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </>
  ),
  'layout-dashboard': (
    <>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </>
  ),
  'chevron-right': <path d="m9 18 6-6-6-6" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
}

export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {GLYPHS[name]}
    </svg>
  )
}

const IMAGE = ['png', 'webp', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'avif']
const AUDIO = ['mp3', 'wav', 'm4a', '3gp', 'flac', 'ogg']

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

/** Obsidian's own defaults, by extension. Video is absent there too — it gets `file`. */
export function iconFor(path: string): IconName {
  const extension = extensionOf(path)
  if (extension === 'canvas') return 'layout-dashboard'
  if (IMAGE.includes(extension)) return 'image'
  if (AUDIO.includes(extension)) return 'file-music'
  return extension === 'md' || extension === 'pdf' ? 'file-text' : 'file'
}

/** Obsidian titles a file by its basename and moves the extension to a tag. */
export const displayName = (name: string) =>
  extensionOf(name) ? name.slice(0, name.lastIndexOf('.')) : name

/** Notes are the default and carry no tag; everything else is labelled. */
export const fileTag = (name: string) => {
  const extension = extensionOf(name)
  return extension === 'md' ? null : extension
}
