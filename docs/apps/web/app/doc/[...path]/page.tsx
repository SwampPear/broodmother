import { DocView } from '../../../src/components/doc-view'

export default async function Page({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return <DocView path={path.join('/')} />
}
