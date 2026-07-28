'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import type { VaultPath } from '@docs/shared'
import { useApp } from '../state'
import { DivergenceDialog } from './divergence-dialog'
import { FileTree, filePaths, type TreeCommand } from './file-tree'
import {
  createFlow,
  deleteFlow,
  moveFlow,
  Palette,
  type Flow,
  type FlowCtx,
} from './palette'
import { StatusLine } from './status-line'

function currentPath(pathname: string): VaultPath | null {
  return pathname.startsWith('/doc/')
    ? decodeURIComponent(pathname.slice('/doc/'.length))
    : null
}

export function Shell({ children }: { children: ReactNode }) {
  const app = useApp()
  const router = useRouter()
  const pathname = usePathname()
  const [flow, setFlow] = useState<Flow | null>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setFlow({ kind: 'commands' })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const ctx: FlowCtx = {
    paths: filePaths(app.entries),
    open: (path) => router.push(`/doc/${path}`),
    create: (path) => void app.create(path).then(() => router.push(`/doc/${path}`)),
    move: (from, to) => void app.move(from, to),
    remove: (path) => void app.remove(path),
    share: (path) => app.share(path),
    syncNow: () => void app.syncNow(),
    settings: () => router.push('/settings'),
  }

  const fromTree = (command: TreeCommand, path: VaultPath) => {
    const flows: Record<TreeCommand, Flow> = {
      create: createFlow(ctx, path),
      move: moveFlow(ctx, path),
      delete: deleteFlow(ctx, path),
    }
    setFlow(flows[command])
  }

  return (
    <div className="shell">
      <FileTree
        entries={app.entries}
        current={currentPath(pathname)}
        onOpen={ctx.open}
        onCommand={fromTree}
      />
      <main className="main">{children}</main>
      <StatusLine
        sync={app.sync}
        session={app.session?.state ?? 'solo'}
        peers={app.session?.peers ?? []}
        notice={app.notice}
        onClearConflict={() => void app.clearConflict()}
        onDismissNotice={app.dismissNotice}
      />
      {flow && <Palette flow={flow} ctx={ctx} setFlow={setFlow} />}
      {app.divergence && (
        <DivergenceDialog report={app.divergence} onChoose={app.resolveDivergence} />
      )}
    </div>
  )
}
