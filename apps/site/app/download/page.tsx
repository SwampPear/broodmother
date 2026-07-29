import Link from 'next/link'
import { Wizard } from './wizard'

/**
 * The newest _published_ release, which is not the same number as the desktop app's
 * `package.json`: a version that has been built but not released yet has no asset behind
 * it, and this page would hand out a link to a file that does not exist. Bump it when the
 * release goes up, not when the version does.
 */
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
