import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'

const root = join(import.meta.dirname, '..')
const banned = /['"](node:)?(fs|fs\/promises|child_process)['"]/

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sources(path)
    if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) return []
    return [path]
  })
}

/** Next.js renders the UI and nothing else; every disk touch belongs to the backend. */
it('never reaches for the filesystem or a subprocess', () => {
  const offenders = [...sources(join(root, 'app')), ...sources(join(root, 'src'))].filter(
    (path) => banned.test(readFileSync(path, 'utf8')),
  )
  expect(offenders).toEqual([])
})
