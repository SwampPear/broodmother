import type { ReactNode } from 'react'
import './globals.css'

export const metadata = {
  title: 'mother',
  description: 'A local-first documentation app — a cross between Obsidian and Notion.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  )
}
