'use client'

import { usePathname, useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  DREAM_EXTENSION,
  emptyDream,
  isDreamPath,
  isImage,
  isNotebookPath,
  projectOf,
  projectRoot,
  serializeDream,
  tilde,
  type DiffBasis,
  type DiffFile,
  type DocRef,
  type DocRoot,
} from '@broodmother/shared'
import { useApp } from '../../state'
import {
  fileRefs,
  FileTree,
  folderOf,
  isFolder,
  parentOf,
  type TreeCommand,
  type TreeRoot,
  untitledIn,
} from '../tree'
import { deleteFlow, type Flow, type FlowCtx, Palette } from '../palette'
import { BranchMenu } from '../branch'
import { changesOf, DiffBar, DiffView, entriesFor } from '../diff'
import { CreateProject } from '../project'
import { VaultMenu, VaultPicker } from '../vault'
import { ProfileMenu, ProfilePicker } from '../profile'
import { Confirm, Icon, Resizer, useStoredSize } from '../ui'
import { StatusLine } from './status-line'
import { type NewTab, type Tab, TabStrip } from './tabs'
import { forget, TerminalPanel, TerminalTab } from '../terminal'
import { currentDoc, docRoute, useScopeTabs } from './scope-tabs'

const SIDEBAR_KEY = 'broodmother.sidebar'
const TERMINAL_KEY = 'broodmother.terminal'

/** Hidden keeps the shell alive behind ⌘J; closed is a shell that exited. */
type TerminalState = 'closed' | 'open' | 'hidden'

export function Shell({ children }: { children: ReactNode }) {
  const app = useApp()
  const router = useRouter()
  const pathname = usePathname()
  const [flow, setFlow] = useState<Flow | null>(null)
  const [sidebar, resize] = useStoredSize('sidebar', SIDEBAR_KEY)
  const [terminalHeight, resizeTerminal] = useStoredSize('panel', TERMINAL_KEY)
  const [terminal, setTerminal] = useState<TerminalState>('closed')
  const [picker, setPicker] = useState(false)
  const [creating, setCreating] = useState(false)
  // The one menu that says where you are working: vault, project and profile together.
  const [whereMenu, setWhereMenu] = useState(false)
  // The row the tree is holding open for a name. Set the moment a note is made, cleared
  // whether the name arrives or not.
  const [renaming, setRenaming] = useState<DocRef | null>(null)
  const [profiling, setProfiling] = useState(false)
  // The project whose row asked to be deleted, held until the confirmation answers.
  const [deleting, setDeleting] = useState<string | null>(null)
  // The branch the one you are on is being held against. Null is not comparing at all —
  // there is no separate flag, because a comparison is the branch it is with.
  const [against, setAgainst] = useState<string | null>(null)
  // The two branches as they stand, which is the question the control above asks: how do
  // these differ. It is not reset when the comparison closes or the branch moves, unlike
  // `against` — which branch you were holding this one against stops being true when you
  // leave, but how you were reading the difference is a preference and stays.
  const [basis, setBasis] = useState<DiffBasis>('now')
  const [diff, setDiff] = useState<DiffFile[]>([])

  const navigate = useCallback((route: string) => router.push(route), [router])
  const {
    tabs,
    terminals,
    activeId,
    terminalTab,
    show,
    pick,
    close,
    closeMany,
    newTerminal,
  } = useScopeTabs({
    scopeKey: app.scopeKey,
    pathname,
    event: app.treeEvent,
    navigate,
  })

  // The terminal tabs that have been on screen at least once. A pane mounts the first time
  // its tab is picked — so its shell attaches to a terminal that is drawn and measured, and
  // what it replays wraps at the width it will be read at — and then stays mounted in the
  // background wherever you go, the shell attached the whole time.
  const openedTerminals = useRef(new Set<string>())
  if (terminalTab) openedTerminals.current.add(terminalTab)

  // One panel per place, made the first time the terminal is opened there and kept mounted
  // in the background after: coming back finds its shells as you left them, still attached,
  // rather than reattaching and replaying on every move.
  const [panels, setPanels] = useState<Record<string, DocRoot>>({})

  const doc = currentDoc(pathname)

  /* Settings and Dreams are pages about the app rather than places in it: nothing here is
     opened in a tab or run in a shell, so the plus and the terminal have nothing to offer
     while one is up. The terminal is hidden rather than closed — a pty that unmounts dies,
     and reading a page is not asking for the shell to end. */
  const appPage = pathname === '/settings' || pathname === '/dreams'

  /* The dream editor takes the bottom panel for its own options, so ⌘J is its key there
     and the terminal stays hidden the way it does on an app page — hidden, not closed. */
  const dreamPage = doc !== null && isDreamPath(doc.path)

  /** What a comparison would open on: the repository's own branch, or failing that any
   *  branch that is not the one you are standing on. Absent, there is nothing to compare. */
  const comparable =
    (
      app.branches.find((one) => one.primary && one.name !== app.branch) ??
      app.branches.find((one) => one.name !== app.branch)
    )?.name ?? null

  /** What the branch menu is about: the name of the repository the scope is standing in. */
  const scopeLabel = app.project?.name ?? app.vault?.name ?? ''

  /** The vault's documents, and under them the files of every project inside it — each its
   *  own root, headed by its name, because each is somewhere you can go and work. Every
   *  root wears what git says its checkout has touched, the way VS Code's explorer does. */
  const trees: TreeRoot[] = [
    {
      root: 'vault',
      entries: app.entries.vault,
      label: app.vault?.name,
      changes: app.changes.vault,
    },
    ...app.projects.map((project) => ({
      root: projectRoot(project.name),
      entries: app.entries.projects[project.name] ?? [],
      label: project.name,
      changes: app.changes.projects[project.name] ?? {},
    })),
  ]

  /**
   * What the tree draws. While two branches are being compared there is one repository in
   * question and the only files worth a row are the ones the two disagree about — and those
   * come out of the comparison rather than out of the sidebar, because a file the other
   * branch has and this one does not is nowhere on disk to be filtered down to.
   */
  const roots: TreeRoot[] = against
    ? [
        {
          root: app.scope,
          entries: entriesFor(diff),
          label: scopeLabel,
          changes: changesOf(diff),
        },
      ]
    : trees

  const entriesOf = (root: DocRoot) => {
    const name = projectOf(root)
    return name ? (app.entries.projects[name] ?? []) : app.entries.vault
  }

  const toggleTerminal = useCallback(
    () => setTerminal((state) => (state === 'open' ? 'hidden' : 'open')),
    [],
  )

  // While the terminal is up, the place you are standing in has a panel. A key still
  // resolving is not a place yet, and no panel is made for one.
  useEffect(() => {
    if (terminal === 'closed' || app.scopeKey.startsWith('#')) return
    setPanels((all) =>
      app.scopeKey in all ? all : { ...all, [app.scopeKey]: app.scope },
    )
  }, [terminal, app.scopeKey, app.scope])

  // What the tree draws and what the pane shows while a comparison is up. Refetched when
  // the place changes and when either tree reports a write: a commit made in a shell moves
  // the branch under you, and what differs is a fact about the branches rather than a
  // snapshot taken when the comparison opened.
  useEffect(() => {
    if (!against) return setDiff([])
    let live = true
    app.client
      .request('GET /api/diff', { root: app.scope, against, basis })
      .then((result) => live && setDiff(result.files))
      .catch(() => live && setDiff([]))
    return () => {
      live = false
    }
  }, [app.client, app.scope, app.scopeKey, app.treeEvent, against, basis])

  // Moving vault, scope or branch ends the comparison: the branch you were holding this one
  // against is not a fact about the one you have just arrived on, and comparing a branch
  // with itself is a blank pane and a question about what went wrong.
  useEffect(() => setAgainst(null), [app.scopeKey])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) return
      if (event.key === 'k') {
        event.preventDefault()
        setFlow({ kind: 'search' })
      } else if (event.key === 'j') {
        event.preventDefault()
        if (!dreamPage) toggleTerminal()
      } else if (event.shiftKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void app.syncNow()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleTerminal, app, dreamPage])

  /**
   * A note is made by making it. `Untitled` in the folder you asked from, open in the pane,
   * and its row in the tree waiting to be typed into — because the dialog that used to
   * stand here asked for a path, and a path is the one thing you cannot give before there
   * is a note to give it to. Naming is the last step, and it is a rename like any other.
   */
  const newDoc = (seed: DocRef, extension: string, contents?: string) => {
    const entries = entriesOf(seed.root)
    const at: DocRef = {
      root: seed.root,
      path: untitledIn(entries, folderOf(entries, seed.path), extension),
    }
    void app.create(at, contents).then((failed) => {
      if (failed) return
      show(docRoute(at))
      setRenaming(at)
    })
  }

  const newNote = (seed: DocRef) => newDoc(seed, '.md')
  // Born with its manual trigger already on the canvas: a dream that opens empty would
  // open as a question, and the file has an answer.
  const newDream = (seed: DocRef) =>
    newDoc(seed, DREAM_EXTENSION, serializeDream(emptyDream()))

  /**
   * Opens a row as a field, a frame from now. Every rename is raised from a menu, and a
   * menu that is still closing puts focus back where it was opened — onto a field that has
   * just mounted and taken it. That blur is read as finishing the rename, so the field
   * would commit the name the row already had and disappear before a key was pressed.
   * A frame later the menu is gone and the field is the only thing asking for focus.
   *
   * A new note does not need this only because creating it is a round trip, which is
   * already longer than the menu takes to go.
   */
  const startRename = (ref: DocRef) => {
    requestAnimationFrame(() => setRenaming(ref))
  }

  /**
   * What the tree hands back when a name is typed, or abandoned. Nothing is a rename that
   * goes nowhere: an empty field, or the name it already had.
   *
   * The new path is built on the parent rather than on `folderOf`, which answers a folder
   * with itself — right for "where does a new note go", wrong here, where it would rename
   * a folder into a child of itself.
   */
  const renamed = (from: DocRef, name: string | null) => {
    setRenaming(null)
    if (!name) return
    const folder = parentOf(from.path)
    const to = folder ? `${folder}/${name}` : name
    if (to !== from.path) void app.move(from.root, from.path, to)
  }

  /**
   * A folder the same way, and for the same reason: `Untitled` where you asked for it, with
   * its row waiting to be typed into. It holds nothing, so there is nothing to open in the
   * pane — the tree is the whole of it.
   */
  const newFolder = (seed: DocRef) => {
    const entries = entriesOf(seed.root)
    const at: DocRef = {
      root: seed.root,
      path: untitledIn(entries, folderOf(entries, seed.path), ''),
    }
    void app.createFolder(at).then((failed) => {
      if (failed) return
      setRenaming(at)
    })
  }

  const ctx: FlowCtx = {
    // The whole vault, not the tree on screen: what a comparison narrows is the sidebar,
    // and the palette is how you reach a document that is not in it.
    refs: fileRefs(trees),
    open: (ref) => show(docRoute(ref)),
    // Seeded from whatever document is open, so a note made from the palette lands beside
    // the one you were reading — in the tree it was read out of.
    newNote: () => newNote(doc ?? { root: 'vault', path: '' }),
    newDream: () => newDream(doc ?? { root: 'vault', path: '' }),
    move: (root, from, to) => void app.move(root, from, to),
    remove: (ref) => void app.remove(ref),
    syncNow: () => void app.syncNow(),
    settings: () => router.push('/settings'),
    dreams: () => router.push('/dreams'),
    vaults: () => setPicker(true),
    projects: () => setWhereMenu(true),
    createProject: () => setCreating(true),
    toggleTerminal,
    // Only text can be shared live: a session is a Y.Text of markdown source, and the
    // canvas and picture viewers keep the editors they have.
    liveDoc:
      doc && !isDreamPath(doc.path) && !isImage(doc.path) && !isNotebookPath(doc.path)
        ? doc
        : null,
    shareLive: () => {
      const target =
        doc && !isDreamPath(doc.path) && !isImage(doc.path) && !isNotebookPath(doc.path)
          ? doc
          : null
      if (!target) return
      void app.shareLive(target).then((answer) => {
        if (typeof answer === 'string') return
        void navigator.clipboard.writeText(answer.invite).catch(() => null)
      })
    },
    joinLive: (invite, path) => {
      const ref: DocRef = { root: 'vault', path }
      void app.joinLive(invite, ref).then((failed) => {
        if (!failed) show(docRoute(ref))
      })
    },
  }

  const newTab = (what: NewTab) =>
    what === 'note' ? ctx.newNote() : newTerminal(what, app.scope)

  /**
   * Closing a terminal tab is the one thing that ends a shell. Everything else that takes a
   * terminal off screen — moving to another project, putting the panel away, reloading the
   * window — is somebody meaning to come back, and the shell goes on running for them; so
   * this is said in so many words rather than left to be read from a socket closing.
   */
  const finish = (tab: Tab) => {
    if (tab.kind !== 'terminal') return
    forget(tab.id)
    void app.client.request('DELETE /api/terminal', { session: tab.id })
  }

  const closeTab = (tab: Tab) => {
    finish(tab)
    close(tab)
  }

  const closeTabs = (going: Tab[]) => {
    going.forEach(finish)
    closeMany(going)
  }

  const fromTree = (command: TreeCommand, ref: DocRef) => {
    if (command === 'create') return newNote(ref)
    if (command === 'create-dream') return newDream(ref)
    if (command === 'create-folder') return newFolder(ref)
    // Renaming is the row turning into a field, not a dialog over the top of it — the same
    // thing a new note does the moment it exists, so there is one way to name anything.
    if (command === 'rename') return startRename(ref)
    if (command === 'delete-project') return setDeleting(projectOf(ref.root))
    setFlow(deleteFlow(ctx, ref, isFolder(entriesOf(ref.root), ref.path)))
  }

  // Who you are is the one thing the app cannot invent: a vault is created working as a
  // profile, so there has to be one to name. Nothing gates on having a vault — an empty
  // app is a state you are allowed to stand in, and the first vault is made the way the
  // tenth is, from the selector at the head of the tree. The gate does not open before the
  // answer is in, or a profile that exists gets asked for anyway on the way past.
  const needsProfile = app.ready && !app.profile

  return (
    <div className="shell" style={{ '--sidebar': `${sidebar}px` } as CSSProperties}>
      <FileTree
        roots={roots}
        current={doc}
        scope={app.scope}
        head={
          <VaultMenu
            vaults={app.vaults}
            activePath={app.config?.vaultPath ?? ''}
            activeProject={app.project?.name ?? null}
            open={whereMenu}
            onOpenChange={setWhereMenu}
            onSelect={(path) => void app.openVault(path)}
            onAdd={() => setPicker(true)}
            onDelete={(name) => void app.deleteVault(name)}
            onCreateProject={() => setCreating(true)}
            onSettings={ctx.settings}
            onDreams={ctx.dreams}
          />
        }
        foot={
          <ProfileMenu
            profiles={app.profiles}
            active={app.profile?.name ?? null}
            onSelect={(name) => void app.selectProfile(name)}
            onAdd={() => setProfiling(true)}
          />
        }
        onOpen={ctx.open}
        // A folder is not a document, so the pane has nothing to show for one. The home
        // screen is what standing in a folder looks like — unless an app page is up, which
        // survives the move and turns to face the scope it landed in.
        onOpenFolder={() => !appPage && show('/')}
        onScope={(root) => void app.setScope(root)}
        onCommand={fromTree}
        onCreateProject={() => setCreating(true)}
        onMove={ctx.move}
        renaming={renaming}
        onRename={renamed}
      />
      <Resizer axis="sidebar" size={sidebar} onSize={resize} />
      <main className="main">
        {/* The strip and the branch it belongs to share one bar: switching branch is what
            changes the tabs, so the control that does it sits with them. Which project you
            are in is asked at the head of the tree, with the vault and the profile. */}
        <div className="tab-bar">
          <TabStrip
            tabs={tabs}
            activeId={activeId}
            onPick={pick}
            onClose={closeTab}
            onNew={appPage ? undefined : newTab}
            // A tab stands for a file, and the file's name is typed where the file is
            // shown: this hands the rename to that row, opening whatever folders were
            // shut around it on the way.
            onRename={(tab) => tab.kind === 'doc' && startRename(tab.ref)}
            onCloseMany={closeTabs}
          />
          {app.branches.length > 0 && (
            <BranchMenu
              label={scopeLabel}
              branches={app.branches}
              active={app.branch}
              onSelect={(name) => void app.openBranch(app.scope, name)}
              onCreate={(name) => app.addBranch(app.scope, name)}
              onDelete={(name) => void app.deleteBranch(app.scope, name)}
            />
          )}
          {/* Beside the branch it is about. There is nothing to hold a branch against
              until the repository has a second one. */}
          {comparable && (
            <button
              type="button"
              className="diff-toggle"
              aria-label="Compare branches"
              aria-pressed={Boolean(against)}
              data-tip="Compare branches"
              onClick={() => {
                setAgainst(against ? null : comparable)
                // The document you were reading is not necessarily one of the ones that
                // differ, and a comparison of a file with itself is not what was asked for.
                if (!against) show('/')
              }}
            >
              <Icon name="compare" />
            </button>
          )}
        </div>
        {against && app.branch && (
          <DiffBar
            current={app.branch}
            against={against}
            basis={basis}
            branches={app.branches}
            files={diff.length}
            onAgainst={setAgainst}
            onBasis={setBasis}
            onClose={() => setAgainst(null)}
          />
        )}
        <div className="main-body">
          <div className="pane" hidden={Boolean(terminalTab)}>
            {against && doc ? (
              <DiffView root={doc.root} path={doc.path} against={against} basis={basis} />
            ) : (
              children
            )}
          </div>
          {terminals
            .filter((tab) => tab.kind === 'terminal')
            .filter((tab) => openedTerminals.current.has(tab.id))
            .map((tab) => (
              <TerminalTab
                key={tab.id}
                kind={tab.shell}
                // The tab's own id, which is written down with it and comes back with it —
                // so the shell it opened can be asked for again by the name it was given.
                name={tab.id}
                root={tab.root}
                active={tab.id === terminalTab}
                onExit={() => close(tab)}
              />
            ))}
        </div>
      </main>
      {Object.entries(panels).map(([scope, root]) => (
        <TerminalPanel
          /* One panel per place, all of them mounted and only the current one visible.
             Moving to another project puts up that project's shells — its own, still
             running and still attached where you left them — rather than carrying these
             along to a folder they were never opened in. */
          key={scope}
          root={root}
          scope={scope}
          height={terminalHeight}
          onHeight={resizeTerminal}
          visible={
            terminal === 'open' && !appPage && !dreamPage && scope === app.scopeKey
          }
          onHide={() => setTerminal('hidden')}
          onExit={() => {
            setPanels(({ [scope]: _gone, ...rest }) => rest)
            if (scope === app.scopeKey) setTerminal('closed')
          }}
        />
      ))}
      <StatusLine
        sync={app.sync}
        notice={app.notice}
        live={app.liveMode}
        peers={app.livePeers}
        onClearConflict={() => void app.clearConflict()}
        onDismissNotice={app.dismissNotice}
        onLeaveLive={app.leaveLive}
      />
      {(profiling || needsProfile) && (
        <ProfilePicker
          existing={app.profiles}
          home={app.home}
          suggested={app.suggestedAuthor}
          current={app.profile?.name ?? null}
          onSelect={(name) => {
            setProfiling(false)
            void app.selectProfile(name)
          }}
          // Closed only once it worked. On first run this modal is held open by there
          // being no profile, so closing it on the way out would have closed nothing and
          // left a failure with nowhere to appear.
          onCreate={async (draft) => {
            const reason = await app.addProfile(draft)
            if (!reason) setProfiling(false)
            return reason
          }}
          onClose={needsProfile ? undefined : () => setProfiling(false)}
        />
      )}
      {deleting && (
        <Confirm
          title={`Delete ${deleting}?`}
          description={`${tilde(app.projects.find((one) => one.name === deleting)?.repo ?? deleting)} and everything in it.`}
          action="delete project"
          onConfirm={() => void app.removeProject(deleting)}
          onClose={() => setDeleting(null)}
        >
          The repository lives in this vault, so this is the last copy of it: the files,
          the branches and the history all go, along with the checkouts broodmother made
          for them. Anything you have not pushed to a remote is gone for good.
        </Confirm>
      )}
      {picker && <VaultPicker onClose={() => setPicker(false)} />}
      {creating && (
        <CreateProject onCreate={app.addProject} onClose={() => setCreating(false)} />
      )}
      {flow && <Palette flow={flow} ctx={ctx} setFlow={setFlow} />}
    </div>
  )
}
