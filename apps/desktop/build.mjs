// Assembles dist/: the Electron main process, and beside it a `runtime/` holding the two
// things it starts — the backend bundled to one file, and the site built to serve itself.
import { execFileSync } from 'node:child_process'
import { cp, mkdir, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../..')
const dist = join(here, 'dist')
const runtime = join(dist, 'runtime')

const bundle = (entry, outfile, { external = [], plugins = [] } = {}) =>
  build({
    entryPoints: [join(here, 'src', entry)],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    external,
    plugins,
    logLevel: 'warning',
  })

/**
 * The pty is a native binary, so it cannot be bundled — and it cannot be left to Node's
 * resolver either, because electron-builder drops any `node_modules` it is handed as a
 * resource. It ships as a plain directory beside the bundle, reached by a relative require
 * the resolver never sees. The platform package looks for its own `.node` and spawn-helper
 * relative to itself, so copying the whole thing keeps it working.
 */
const PTY = `node-pty-darwin-${process.arch}`
const ptyBesideTheBundle = {
  name: 'pty-beside-the-bundle',
  setup: (esbuild) =>
    esbuild.onResolve({ filter: /^@lydell\/node-pty$/ }, () => ({
      path: './pty/lib/index.js',
      external: true,
    })),
}

await rm(dist, { recursive: true, force: true })
await mkdir(runtime, { recursive: true })

await bundle('main.ts', join(dist, 'main.cjs'), { external: ['electron'] })
await cp(join(here, 'src/loading.html'), join(dist, 'loading.html'))
// The Dock icon a checkout run wears. `build/icon.icns` is what electron-builder stamps
// into the bundle, and Electron cannot read an icns, so the mark comes from the one PNG
// the whole app already draws it from rather than from a second copy kept in step by hand.
await cp(join(root, 'apps/web/public/logo.png'), join(dist, 'icon.png'))

await bundle('server.ts', join(runtime, 'server/index.cjs'), {
  plugins: [ptyBesideTheBundle],
})
await cp(join(root, 'node_modules/@lydell', PTY), join(runtime, 'server/pty'), {
  recursive: true,
})

execFileSync('npm', ['run', 'build', '-w', '@broodmother/web'], {
  cwd: root,
  stdio: 'inherit',
})
// `standalone` traces the server and its dependencies but copies neither the client bundles
// nor public/ — Next expects whoever ships it to put those two back.
const web = join(runtime, 'web/apps/web')
await cp(join(root, 'apps/web/.next/standalone'), join(runtime, 'web'), {
  recursive: true,
})
await cp(join(root, 'apps/web/.next/static'), join(web, '.next/static'), {
  recursive: true,
})
await cp(join(root, 'apps/web/public'), join(web, 'public'), { recursive: true })

console.log(`built ${dist}`)
