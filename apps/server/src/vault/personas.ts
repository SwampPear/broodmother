import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Persona } from '@broodmother/shared'

/** A persona that exists is worth naming even when nobody has said what for. */
const NO_DESCRIPTION = 'no description — read its PERSONA.md'

/** One line between two `---` fences is a regex, not a parser. */
const FENCE = /^---\n([\s\S]*?)\n---/

export async function scanPersonas(checkout: string): Promise<Persona[]> {
  const dir = path.join(checkout, '.personas')
  const dirents = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const personas: Persona[] = []
  for (const dirent of dirents) {
    if (!dirent.isDirectory()) continue
    const persona = await readFile(
      path.join(dir, dirent.name, 'PERSONA.md'),
      'utf8',
    ).catch(() => null)
    if (persona === null) continue
    // The folder is the name, the same rule vaults and branches follow — the frontmatter
    // may carry one, but the folder is the authority `mv` updates.
    personas.push({ name: dirent.name, description: descriptionOf(persona) })
  }
  return personas.sort((a, b) => a.name.localeCompare(b.name))
}

/** The body a dream's Claude node wears as its added system prompt: the PERSONA.md with
 *  any frontmatter stripped, or null when the vault has no persona by that name. The name
 *  comes from a hand-editable `.dream` file, so anything that is not a plain folder name
 *  answers null rather than reaching outside `.personas/`. */
export async function readPersona(
  checkout: string,
  name: string,
): Promise<string | null> {
  if (!name || name.startsWith('.') || name.includes('/') || name.includes('\\'))
    return null
  const file = path.join(checkout, '.personas', name, 'PERSONA.md')
  const persona = await readFile(file, 'utf8').catch(() => null)
  if (persona === null) return null
  const fence = persona.match(FENCE)
  const body = fence ? persona.slice(fence[0].length) : persona
  return body.replace(/^\n+/, '')
}

function descriptionOf(persona: string): string {
  const fence = persona.match(FENCE)
  const line = fence?.[1]
    .split('\n')
    .find((candidate) => candidate.startsWith('description:'))
  return line?.slice('description:'.length).trim() || NO_DESCRIPTION
}

const HELLO_PERSONA = `---
name: hello
description: prove the personas folder works — pick it on a dream's Claude node
---

You are the placeholder persona every vault starts with, here to be copied and then
replaced. A persona is a folder under \`.personas/\`: a PERSONA.md whose body becomes the
agent's added system prompt when a dream's Claude node wears it. Say so, briefly, in
everything you write, so a run wearing this persona is unmistakable.
`

/** The placeholder a new vault is born with — its own documentation, in the format,
 *  saying so. */
export async function seedPersonas(checkout: string): Promise<void> {
  const dir = path.join(checkout, '.personas', 'hello')
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, 'PERSONA.md'), HELLO_PERSONA)
}
