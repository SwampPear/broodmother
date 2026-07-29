import Link from 'next/link'
import { Wizard } from './wizard'

const VERSION = '0.1.1'
const REPO = 'https://github.com/SwampPear/broodmother'

/**
 * The disk image lives on the GitHub release rather than in this repo: at 135 MB it is
 * past GitHub's 100 MB ceiling for a tracked file, and serving it from the release keeps
 * it out of every clone while still giving the page a stable, versioned URL.
 */
const FILE = `${REPO}/releases/download/v${VERSION}/broodmother-${VERSION}-arm64.dmg`

/** Bumped alongside VERSION — the release asset is the thing this describes. */
const SIZE = '135 MB'

export default function Download() {
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

      <Wizard file={FILE} version={VERSION} size={SIZE} />
    </main>
  )
}
