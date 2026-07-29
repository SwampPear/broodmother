import { DocView } from '../../../src/components/doc-view'

/** Next hands catch-all segments as they appear in the URL, so a document with a space in
 *  its name arrives as `The%20Journey.md` and reaches the server — and `open()` — that way.
 *  A malformed escape is passed through rather than thrown on: the vault then answers "no
 *  such document", which is the truth. */
function decode(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

export default async function Page({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return <DocView path={path.map(decode).join('/')} />
}
