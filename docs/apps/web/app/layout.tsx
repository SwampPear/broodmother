import type { ReactNode } from 'react'
import { Shell } from '../src/components/shell'
import { AppProvider } from '../src/state'
import './globals.css'

export const metadata = { title: 'docs' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <AppProvider>
          <Shell>{children}</Shell>
        </AppProvider>
      </body>
    </html>
  )
}
