'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DocPath, DocRef, DocRoot } from '@broodmother/shared'
import type { RootEvent } from '../../state'
import { docTab, type Tab } from './tabs'
import { type TerminalKind } from '../terminal'

const ROUTES_KEY = 'broodmother.routes'

// One array, so a scope with nothing open does not get a new one every render.
const EMPTY: Tab[] = []

const isRoot = (value: string): value is DocRoot =>
  value === 'vault' || /^project:.+$/.test(value)

/** `/doc/<root>/<path>` — a path alone stopped being an address the moment a vault could
 *  link more than one repository, so the route names the tree first. */
export function currentDoc(pathname: string): DocRef | null {
  if (!pathname.startsWith('/doc/')) return null
  const rest = decodeURIComponent(pathname.slice('/doc/'.length))
  const cut = rest.indexOf('/')
  if (cut === -1) return null
  const root = rest.slice(0, cut)
  if (!isRoot(root)) return null
  const path = rest.slice(cut + 1)
  return path ? { root, path } : null
}

export const docRoute = (ref: DocRef) => `/doc/${ref.root}/${ref.path}`

/** Where a path ends up when `from` becomes `to`, including everything inside it. */
function after(path: DocPath, from: DocPath, to: DocPath): DocPath | null {
  if (path === from) return to
  return path.startsWith(`${from}/`) ? `${to}${path.slice(from.length)}` : null
}

export interface ScopeTabs {
  tabs: Tab[]
  /** A terminal if one is up, otherwise whatever the route names. */
  activeId: string | null
  /** Set only while a terminal tab is up, which is when the document pane is hidden. */
  terminalTab: string | null
  /** Show a route, and mean it: a click that also moves the scope has already said where
   *  it wants to be, so the move honours it rather than restoring where you were. */
  show(route: string): void
  pick(tab: Tab): void
  close(tab: Tab): void
  closeMany(going: Tab[]): void
  newTerminal(shell: TerminalKind, root: DocRoot): void
}

/** The open tabs and the route, filed under the scope they belong to: a file open in two
 *  branches is two files, and switching carries nothing across. Moving between the vault and
 *  a project is the same kind of move, which is why it swaps the strip too. */
export function useScopeTabs({
  scopeKey,
  pathname,
  event,
  navigate,
}: {
  /** Vault, the root you are scoped to, and that root's branch. See `App.scopeKey`. */
  scopeKey: string
  pathname: string
  /** The last change any tree reported, so a renamed document stays open. */
  event: RootEvent | null
  navigate: (route: string) => void
}): ScopeTabs {
  const nextTerminal = useRef(1)
  const [byScope, setByScope] = useState<Record<string, Tab[]>>({})
  const [terminalTab, setTerminalTab] = useState<string | null>(null)

  const tabs = byScope[scopeKey] ?? EMPTY
  const setTabs = useCallback(
    (next: Tab[] | ((open: Tab[]) => Tab[])) =>
      setByScope((all) => ({
        ...all,
        [scopeKey]: typeof next === 'function' ? next(all[scopeKey] ?? EMPTY) : next,
      })),
    [scopeKey],
  )

  // Where you were in each scope. The route is one route for the whole window, so without
  // this, switching branch leaves the document you were reading on screen — a file from a
  // branch you are no longer on.
  const lastRoute = useRef<Record<string, string>>({})

  // Which vault is open arrives a request after the first paint, so a tab opened from the
  // URL in the meantime is filed under a key that names no vault. When the real one turns
  // up, those tabs are its: they were always its, the app just could not say so yet.
  const filedUnder = useRef(scopeKey)
  // What the sidebar just asked to show, held until it is on screen or until the scope
  // change it triggered has honoured it.
  const asked = useRef<string | null>(null)

  // Recorded only while the scope has not changed yet. Filing the route under the key it
  // is moving to would record where you are as where you were going, and the effect below
  // would find nothing to go back to.
  if (filedUnder.current === scopeKey) {
    lastRoute.current[scopeKey] = pathname
    // Arrived without the scope moving, so there is nothing left for the ask to survive.
    if (asked.current === pathname) asked.current = null
  }

  useEffect(() => {
    const from = filedUnder.current
    if (from === scopeKey) return
    filedUnder.current = scopeKey

    if (from.startsWith('#')) {
      setByScope((all) => {
        const carried = all[from]
        if (!carried?.length || all[scopeKey]?.length) return all
        const { [from]: _dropped, ...rest } = all
        return { ...rest, [scopeKey]: carried }
      })
      return
    }

    // A real move between scopes. Go back to whatever was open here, or to the home
    // screen when nothing was — the document from the scope you left is not this one’s.
    const going = lastRoute.current[scopeKey] ?? '/'
    setTerminalTab(null)
    if (going !== pathname) navigate(going)
    // `pathname` is deliberately absent: this runs when the scope changes, and reading the
    // route it changed away from is the whole point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey, navigate])

  // Read after mount: the server has no localStorage to hydrate from. Only the scopes you
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
  // crash between the two, and the page you were on is the thing being remembered. Scopes
  // filed before the vault answered are dropped: `#local##` names no vault, and the real key
  // for the same place is written a moment later anyway.
  useEffect(() => {
    const keep = Object.entries(lastRoute.current).filter(([key]) => !key.startsWith('#'))
    localStorage.setItem(ROUTES_KEY, JSON.stringify(Object.fromEntries(keep)))
  }, [scopeKey, pathname])

  const doc = currentDoc(pathname)
  const activeId = terminalTab ?? (doc ? docTab(doc).id : null)

  // Opening a document is how a tab appears — from the tree, the palette, a link, or a reload
  // onto a URL that was already open.
  useEffect(() => {
    if (!doc) return
    const tab = docTab(doc)
    setTabs((open) => (open.some((one) => one.id === tab.id) ? open : [...open, tab]))
    setTerminalTab(null)
  }, [doc?.root, doc?.path])

  // A renamed document is the same document. Without this the route goes on naming a file
  // that is no longer there — the tab wears a name nothing has, and the pane says there is no
  // such document, which of a note you just named is a lie.
  useEffect(() => {
    if (event?.event.type !== 'moved') return
    const { from, to } = event.event
    setTabs((open) =>
      open.map((tab) => {
        if (tab.kind !== 'doc' || tab.ref.root !== event.root) return tab
        const path = after(tab.ref.path, from, to)
        return path ? docTab({ root: event.root, path }) : tab
      }),
    )
    const here = currentDoc(pathname)
    const path = here && here.root === event.root ? after(here.path, from, to) : null
    if (path) navigate(docRoute({ root: event.root, path }))
    // `pathname` is read, not depended on: this follows the move, and a later navigation is
    // not one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event])

  function show(route: string) {
    asked.current = route
    setTerminalTab(null)
    navigate(route)
  }

  function pick(tab: Tab) {
    if (tab.kind === 'terminal') return setTerminalTab(tab.id)
    show(docRoute(tab.ref))
  }

  function settle(next: Tab | undefined) {
    if (next) return pick(next)
    show('/')
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

  function newTerminal(shell: TerminalKind, root: DocRoot) {
    const id = `terminal:${nextTerminal.current++}`
    setTabs((open) => [...open, { id, kind: 'terminal', shell, root }])
    setTerminalTab(id)
  }

  return { tabs, activeId, terminalTab, show, pick, close, closeMany, newTerminal }
}
