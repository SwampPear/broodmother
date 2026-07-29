import type { ReactNode } from 'react'
import './globals.css'

export const metadata = {
  title: 'broodmother',
  description: 'Local markdown optimized for collaboration between people and agents.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  )
}
