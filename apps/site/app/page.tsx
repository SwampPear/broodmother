import Link from 'next/link'
import { Apple } from './apple'

export default function Page() {
  return (
    <main>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo" src="/logo.png" alt="" width={56} height={56} />
      <h1>broodmother</h1>
      <p className="tagline">
        Local markdown optimized for collaboration between people and agents.
      </p>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="shot"
        src="/screenshot.png"
        alt="broodmother open on a vault: file tree, tabs, a rendered markdown note, and a terminal panel"
        width={2000}
        height={1158}
      />

      <Link className="button" href="/download">
        <Apple />
        Download
      </Link>
    </main>
  )
}
