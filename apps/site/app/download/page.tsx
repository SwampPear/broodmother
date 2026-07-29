import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import Link from 'next/link'
import { Wizard } from './wizard'

const VERSION = '0.1.0'
const FILE = `/downloads/broodmother-${VERSION}-arm64.dmg`

/** Rendered per request: the build is a file someone drops in, not something bundled. */
export const dynamic = 'force-dynamic'

/** The size on the page is the size of the file being served, not a number typed once. */
async function size(): Promise<string | null> {
  return stat(join(process.cwd(), 'public', FILE)).then(
    (file) => `${Math.round(file.size / 1e6)} MB`,
    () => null,
  )
}

export default async function Download() {
  const ready = await size()

  return (
    <main className="page">
      <Link className="back" href="/">
        ← broodmother
      </Link>
      <h1>Download broodmother</h1>
      <p className="tagline">
        The Mac app carries the editor and its backend together. It reads plain markdown
        out of a folder you choose, and nothing leaves your machine.
      </p>

      {ready ? (
        <Wizard file={FILE} version={VERSION} size={ready} />
      ) : (
        <div className="box">
          <div className="notice">
            <p>
              No build here yet. <code>npm run dist -w @broodmother/desktop</code> makes
              one, and <code>apps/site/public{FILE}</code> is where this page looks for
              it.
            </p>
          </div>
        </div>
      )}
    </main>
  )
}
