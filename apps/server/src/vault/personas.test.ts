import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { cleanup, tempDir } from '../test'
import { readPersona, scanPersonas, seedPersonas } from './personas'

afterAll(cleanup)

async function seed(checkout: string, name: string, persona: string | null) {
  const dir = path.join(checkout, '.personas', name)
  await mkdir(dir, { recursive: true })
  if (persona !== null) await writeFile(path.join(dir, 'PERSONA.md'), persona)
}

const persona = (front: string) => `---\n${front}\n---\n\nYou are the body.\n`

describe('scanPersonas', () => {
  it('names every persona, sorted, with its description', async () => {
    const checkout = await tempDir()
    await seed(checkout, 'reviewer', persona('description: reads every diff twice'))
    await seed(checkout, 'archivist', persona('description: files what others forget'))

    expect(await scanPersonas(checkout)).toEqual([
      { name: 'archivist', description: 'files what others forget' },
      { name: 'reviewer', description: 'reads every diff twice' },
    ])
  })

  it('takes the name from the folder, whatever the frontmatter says', async () => {
    const checkout = await tempDir()
    await seed(checkout, 'here', persona('name: elsewhere\ndescription: does a thing'))

    expect(await scanPersonas(checkout)).toEqual([
      { name: 'here', description: 'does a thing' },
    ])
  })

  it('skips a directory without a PERSONA.md', async () => {
    const checkout = await tempDir()
    await seed(checkout, 'real', persona('description: the real one'))
    await seed(checkout, 'scraps', null)

    expect((await scanPersonas(checkout)).map((one) => one.name)).toEqual(['real'])
  })

  it('names a persona that never says what it is for', async () => {
    const checkout = await tempDir()
    await seed(checkout, 'mystery', persona('name: mystery'))

    expect(await scanPersonas(checkout)).toEqual([
      { name: 'mystery', description: 'no description — read its PERSONA.md' },
    ])
  })

  it('answers a vault with no personas folder with nothing', async () => {
    expect(await scanPersonas(await tempDir())).toEqual([])
  })

  it('round-trips its own seed', async () => {
    const checkout = await tempDir()
    await seedPersonas(checkout)

    expect(await scanPersonas(checkout)).toEqual([
      {
        name: 'hello',
        description: "prove the personas folder works — pick it on a dream's Claude node",
      },
    ])
  })
})

describe('readPersona', () => {
  it('answers the body with the frontmatter stripped', async () => {
    const checkout = await tempDir()
    await seed(checkout, 'reviewer', persona('description: reads every diff twice'))

    expect(await readPersona(checkout, 'reviewer')).toBe('You are the body.\n')
  })

  it('answers a file with no frontmatter whole', async () => {
    const checkout = await tempDir()
    await seed(checkout, 'lens', '# Lens\n\nYou are Lens, the code reviewer.\n')

    expect(await readPersona(checkout, 'lens')).toBe(
      '# Lens\n\nYou are Lens, the code reviewer.\n',
    )
  })

  it('answers null for a persona the vault does not have', async () => {
    expect(await readPersona(await tempDir(), 'ghost')).toBeNull()
  })

  it('never follows a name outside the personas folder', async () => {
    const checkout = await tempDir()
    await writeFile(path.join(checkout, 'PERSONA.md'), 'not a persona')

    expect(await readPersona(checkout, '..')).toBeNull()
    expect(await readPersona(checkout, '../..')).toBeNull()
    expect(await readPersona(checkout, '.hidden')).toBeNull()
    expect(await readPersona(checkout, '')).toBeNull()
  })
})
