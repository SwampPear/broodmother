import { spawn, type ChildProcess } from 'node:child_process'
import { join } from 'node:path'
import { app, BrowserWindow, shell } from 'electron'

const SITE = 'http://127.0.0.1:6767'

/**
 * Launched from Finder, an app inherits none of a login shell — no `git`, no homebrew, no
 * `SHELL`. The vault is a git repository and the terminal panel is a shell, so both are
 * handed a PATH here rather than discovering they have none.
 */
const PATH = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  '/usr/bin',
  '/bin',
  '/usr/sbin',
  '/sbin',
]
  .concat(process.env.PATH ? [process.env.PATH] : [])
  .join(':')

/** Assembled by `build.mjs`, then shipped beside the asar rather than inside it. */
const runtime = app.isPackaged
  ? join(process.resourcesPath, 'runtime')
  : join(__dirname, 'runtime')

const children: ChildProcess[] = []
let quitting = false

/** Electron's own binary is the Node the backend and the site run on — there is no other. */
function node(
  script: string,
  cwd: string,
  env: Record<string, string> = {},
): ChildProcess {
  return spawn(process.execPath, [script], {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, ...env, PATH, ELECTRON_RUN_AS_NODE: '1' },
  })
}

function startBackends(): void {
  children.push(node(join(runtime, 'server', 'index.cjs'), join(runtime, 'server')))
  children.push(
    node(
      join(runtime, 'web', 'apps', 'web', 'server.js'),
      join(runtime, 'web', 'apps', 'web'),
      {
        HOSTNAME: '127.0.0.1',
        PORT: '6767',
      },
    ),
  )
  // Half of broodmother is not broodmother: with either process gone the window is talking to air,
  // so the first exit takes the app down instead of leaving a broken tab open.
  for (const child of children) child.on('exit', () => !quitting && app.quit())
}

function stopBackends(): void {
  quitting = true
  for (const child of children) child.kill('SIGTERM')
}

async function waitForSite(): Promise<boolean> {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (quitting) return false
    const up = await fetch(SITE).then(
      () => true,
      () => false,
    )
    if (up) return true
    await new Promise((done) => setTimeout(done, 250))
  }
  return false
}

async function createWindow(): Promise<void> {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 720,
    minHeight: 480,
    backgroundColor: '#000000',
    titleBarStyle: 'hiddenInset',
    show: false,
  })
  window.once('ready-to-show', () => window.show())
  // The window controls float over the page, landing on the top-left of the app's own
  // chrome. The app is told how wide they are; where to put them is its business, not ours.
  window.webContents.on('did-finish-load', () => {
    void window.webContents.insertCSS(':root { --titlebar-inset: 5rem }')
  })
  // A vault link to somewhere on the web is the browser's job; this window is the app.
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  await window.loadFile(join(__dirname, 'loading.html'))
  if (await waitForSite()) await window.loadURL(SITE)
}

void app.whenReady().then(async () => {
  startBackends()
  await createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow()
  })
})

// One window is the whole app: closing it is quitting, not hiding a running vault server.
app.on('window-all-closed', () => app.quit())
app.on('before-quit', stopBackends)
