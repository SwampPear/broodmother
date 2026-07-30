'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { VaultEvent, VaultPath } from '@broodmother/shared'
import { docTab, type Tab } from './tabs'
import { type TerminalKind } from '../terminal'

const ROUTES_KEY = 'broodmother.routes'

// One array, so a checkout with nothing open does not get a new one every render.
const EMPTY: Tab[] = []

export function currentPath(pathname: string): VaultPath | null {
  return pathname.startsWith('/doc/')
    ? decodeURIComponent(pathname.slice('/doc/'.length))
    : null
}

/** Where a path ends up when `from` becomes `to`, including everything inside it. */
function after(path: VaultPath, from: VaultPath, to: VaultPath): VaultPath | null {
  if (path === from) return to
  return path.startsWith(`${from}/`) ? `${to}${path.slice(from.length)}` : null
}

export interface CheckoutTabs {
  tabs: Tab[]
  /** A terminal if one is up, otherwise whatever the route names. */
  activeId: string | null
  /** Set only while a terminal tab is up, which is when the document pane is hidden. */
  terminalTab: string | null
  pick(tab: Tab): void
  close(tab: Tab): void
  closeMany(going: Tab[]): void
  newTerminal(shell: TerminalKind): void
}

/** The open tabs and the route, filed under the checkout they belong to: a file open in two
 *  worktrees is two files, and switching carries nothing across. */
export function useCheckoutTabs({
  checkout,
  pathname,
  event,
  navigate,
}: {
  /** Vault and worktree as one key. See `App.checkout`. */
  checkout: string
  pathname: string
  /** The last change the vault reported, so a renamed document stays open. */
  event: VaultEvent | null
  navigate: (route: string) => void
}): CheckoutTabs {
  const nextTerminal = useRef(1)
  const [byCheckout, setByCheckout] = useState<Record<string, Tab[]>>({})
  const [terminalTab, setTerminalTab] = useState<string | null>(null)

  const tabs = byCheckout[checkout] ?? EMPTY
  const setTabs = useCallback(
    (next: Tab[] | ((open: Tab[]) => Tab[])) =>
      setByCheckout((all) => ({
        ...all,
        [checkout]: typeof next === 'function' ? next(all[checkout] ?? EMPTY) : next,
      })),
    [checkout],
  )

  // Where you were in each checkout. The route is one route for the whole window, so without
  // this, switching worktree leaves the document you were reading on screen — a file from a
  // branch you are no longer on.
  const lastRoute = useRef<Record<string, string>>({})

  // Which vault is open arrives a request after the first paint, so a tab opened from the URL
  // in the meantime is filed under a key that names no vault. When the real one turns up,
  // those tabs are its: they were always its, the app just could not say so yet.
  const filedUnder = useRef(checkout)
  // Recorded only while the checkout has not changed yet. Filing the route under the key it
  // is moving to would record where you are as where you were going, and the effect below
  // would find nothing to go back to.
  if (filedUnder.current === checkout) lastRoute.current[checkout] = pathname

  useEffect(() => {
    const from = filedUnder.current
    if (from === checkout) return
    filedUnder.current = checkout

    if (from.startsWith('#')) {
      setByCheckout((all) => {
        const carried = all[from]
        if (!carried?.length || all[checkout]?.length) return all
        const { [from]: _dropped, ...rest } = all
        return { ...rest, [checkout]: carried }
      })
      return
    }

    // A real switch between checkouts. Go back to whatever was open here, or to the home
    // screen when nothing was — the document from the checkout you left is not this one's.
    const going = lastRoute.current[checkout] ?? '/'
    setTerminalTab(null)
    if (going !== pathname) navigate(going)
    // `pathname` is deliberately absent: this runs when the checkout changes, and reading the
    // route it changed away from is the whole point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkout, navigate])

  // Read after mount: the server has no localStorage to hydrate from. Only the checkouts you
  // are not in matter — the one you are in is tracked live, and a relaunch lands on the home
  // screen, which is then honestly where you are.
  useEffect(() => {
    try {
      Object.assign(
        lastRoute.current,
        JSON.parse(localStorage.getItem(ROUTES_KEY) ?? '{}'),
      )
    } catch {
      // A map that cannot be read is a map that has nothing in it.
    }
  }, [])

  // Written on every move rather than on the switch, because the window can close, reload or
  // crash between the two, and the page you were on is the thing being remembered. Checkouts
  // filed before the vault answered are dropped: `#local` names no vault, and the real key
  // for the same place is written a moment later anyway.
  useEffect(() => {
    const keep = Object.entries(lastRoute.current).filter(([key]) => !key.startsWith('#'))
    localStorage.setItem(ROUTES_KEY, JSON.stringify(Object.fromEntries(keep)))
  }, [checkout, pathname])

  const path = currentPath(pathname)
  const activeId = terminalTab ?? (path ? docTab(path).id : null)

  // Opening a document is how a tab appears — from the tree, the palette, a link, or a reload
  // onto a URL that was already open.
  useEffect(() => {
    if (!path) return
    const tab = docTab(path)
    setTabs((open) => (open.some((one) => one.id === tab.id) ? open : [...open, tab]))
    setTerminalTab(null)
  }, [path])

  // A renamed document is the same document. Without this the route goes on naming a file
  // that is no longer there — the tab wears a name nothing has, and the pane says there is no
  // such document, which of a note you just named is a lie.
  useEffect(() => {
    if (event?.type !== 'moved') return
    setTabs((open) =>
      open.map((tab) => {
        const to = tab.kind === 'doc' ? after(tab.path, event.from, event.to) : null
        return to ? docTab(to) : tab
      }),
    )
    const here = currentPath(pathname)
    const to = here && after(here, event.from, event.to)
    if (to) navigate(`/doc/${to}`)
    // `pathname` is read, not depended on: this follows the move, and a later navigation is
    // not one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event])

  function pick(tab: Tab) {
    if (tab.kind === 'terminal') return setTerminalTab(tab.id)
    setTerminalTab(null)
    navigate(`/doc/${tab.path}`)
  }

  function settle(next: Tab | undefined) {
    if (next) return pick(next)
    setTerminalTab(null)
    navigate('/')
  }

  function close(tab: Tab) {
    const index = tabs.findIndex((one) => one.id === tab.id)
    const rest = tabs.filter((one) => one.id !== tab.id)
    setTabs(rest)
    if (tab.id !== activeId) return
    settle(rest[index] ?? rest[index - 1])
  }

  function closeMany(going: Tab[]) {
    const doomed = new Set(going.map((one) => one.id))
    const rest = tabs.filter((one) => !doomed.has(one.id))
    setTabs(rest)
    if (!activeId || !doomed.has(activeId)) return
    settle(rest[rest.length - 1])
  }

  function newTerminal(shell: TerminalKind) {
    const id = `terminal:${nextTerminal.current++}`
    setTabs((open) => [...open, { id, kind: 'terminal', shell }])
    setTerminalTab(id)
  }

  return { tabs, activeId, terminalTab, pick, close, closeMany, newTerminal }
}
