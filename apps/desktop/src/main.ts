import { spawn, type ChildProcess } from 'node:child_process'
import { join } from 'node:path'
import { app, BrowserWindow, Menu, shell } from 'electron'

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

// Packaged, the name comes off the bundle electron-builder stamped. Run from a checkout
// there is no bundle to read, so Electron calls the app after itself — in the menu bar, in
// the About box, and in the folder it keeps its own state in. It is the same app either way
// and answers to the same name.
app.setName('broodmother')

/** Assembled by `build.mjs`, then shipped beside the asar rather than inside it. */
const runtime = app.isPackaged
  ? join(process.resourcesPath, 'runtime')
  : join(__dirname, 'runtime')

/** The logo, copied beside the bundle by `build.mjs`. */
const icon = join(__dirname, 'icon.png')

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

function sendTitlebarInset(window: BrowserWindow): void {
  const inset = window.isFullScreen() ? '0px' : '5rem'
  void window.webContents.executeJavaScript(
    `document.documentElement.style.setProperty('--titlebar-inset', '${inset}')`,
  )
}

async function createWindow(url: string = SITE): Promise<void> {
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
  const inset = () => sendTitlebarInset(window)
  window.webContents.on('did-finish-load', inset)
  window.on('enter-full-screen', inset)
  window.on('leave-full-screen', inset)
  window.webContents.setWindowOpenHandler(({ url: opened }) => {
    if (opened.startsWith(SITE)) void createWindow(opened)
    else void shell.openExternal(opened)
    return { action: 'deny' }
  })

  await window.loadFile(join(__dirname, 'loading.html'))
  if (await waitForSite()) await window.loadURL(url)
}

function installMenu(): void {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { role: 'appMenu' },
      {
        label: 'File',
        submenu: [
          {
            label: 'New Window',
            accelerator: 'CmdOrCtrl+Shift+N',
            click: () => void createWindow(),
          },
          { type: 'separator' },
          { role: 'close' },
        ],
      },
      { role: 'editMenu' },
      { role: 'viewMenu' },
      { role: 'windowMenu' },
    ]),
  )
}

void app.whenReady().then(async () => {
  // ensure icon set
  if (!app.isPackaged) app.dock?.setIcon(icon)

  installMenu()
  startBackends()

  await createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow()
  })
})

app.on('window-all-closed', () => app.quit()) // quit on last window closed
app.on('before-quit', stopBackends) // cleanup
