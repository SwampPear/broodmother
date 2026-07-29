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

const bundle = (entry, outfile, external) =>
  build({
    entryPoints: [join(here, 'src', entry)],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    external,
    logLevel: 'warning',
  })

await rm(dist, { recursive: true, force: true })
await mkdir(runtime, { recursive: true })

await bundle('main.ts', join(dist, 'main.cjs'), ['electron'])
await cp(join(here, 'src/loading.html'), join(dist, 'loading.html'))

// The pty is a native binary; bundling it would mean inlining a `.node` file, so it stays
// a require against the copy below.
await bundle('server.ts', join(runtime, 'server/index.cjs'), ['@lydell/node-pty'])
for (const pkg of ['node-pty', `node-pty-darwin-${process.arch}`])
  await cp(
    join(root, 'node_modules/@lydell', pkg),
    join(runtime, 'node_modules/@lydell', pkg),
    {
      recursive: true,
    },
  )

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
