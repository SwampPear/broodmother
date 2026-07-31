import { readFile, writeFile } from 'node:fs/promises'
import { afterAll, expect, it } from 'vitest'
import { DEFAULT_SOUL } from './brief'
import { createProfile, findProfile, writeIdentity } from './profiles'
import { cleanup, tempDir } from './test'

afterAll(cleanup)

const IDENTITY = {
  color: '#8fb8d8',
  gitAuthor: { name: 'Test', email: 'test@localhost' },
  sshKeyPath: null,
  claudeCfgDir: null,
  soul: null,
}

/* The profile page is where a soul is written, and a box showing nothing over a prompt the
   agents are already held to is the page lying about what they were told. A profile made a
   moment ago is handed straight back to the app, so it has to read the same way. */
it('reads a profile with nothing of its own back as the default soul', async () => {
  const home = await tempDir()
  const made = await createProfile({ name: 'ada', ...IDENTITY }, home)

  expect(made.soul).toBe(DEFAULT_SOUL)
  expect((await findProfile('ada', home))?.soul).toBe(DEFAULT_SOUL)
})

/* Clearing the box saves a soul of nothing, and what comes back is what the page then
   shows — the default, without waiting for the app to be opened again. */
it('hands back the default when a soul is saved away', async () => {
  const home = await tempDir()
  const made = await createProfile({ name: 'ada', ...IDENTITY }, home)
  const written = await writeIdentity(made, { ...IDENTITY, soul: '# Ada\n\nTerse.' })
  expect(written.soul).toBe('# Ada\n\nTerse.')

  expect((await writeIdentity(made, { ...IDENTITY, soul: null })).soul).toBe(DEFAULT_SOUL)
})

/* The default is a floor, not a copy taken on the day the profile was made: leaving it
   alone must leave the file empty so a better default reaches every profile that has one.
   The page opens on the default's own text, so saving it untouched sends that text back. */
it('never writes the default into the file', async () => {
  const home = await tempDir()
  const made = await createProfile({ name: 'ada', ...IDENTITY }, home)

  for (const soul of [null, DEFAULT_SOUL, `${DEFAULT_SOUL}\n`]) {
    const back = await writeIdentity(made, { ...IDENTITY, soul })
    expect(JSON.parse(await readFile(made.path, 'utf8')).soul).toBe(null)
    expect(back.soul).toBe(DEFAULT_SOUL)
  }
})

/* A file dropped in by hand says nothing about a soul at all, which is the same as saying
   nothing in it. */
it('reads a profile whose file never mentions a soul back as the default', async () => {
  const home = await tempDir()
  await createProfile({ name: 'ada', ...IDENTITY }, home)
  const { path } = (await findProfile('ada', home))!
  await writeFile(path, `${JSON.stringify({ color: '#8fb8d8' }, null, 2)}\n`)

  expect((await findProfile('ada', home))?.soul).toBe(DEFAULT_SOUL)
})

it('keeps a soul somebody wrote', async () => {
  const home = await tempDir()
  const made = await createProfile({ name: 'ada', ...IDENTITY }, home)
  await writeIdentity(made, { ...IDENTITY, soul: '# Ada\n\nTerse.' })

  expect((await findProfile('ada', home))?.soul).toBe('# Ada\n\nTerse.')
})

/* Clearing the box is how a soul is given back, and what it is given back to is the
   default rather than nothing at all. */
it('reads a soul cleared to whitespace back as the default', async () => {
  const home = await tempDir()
  const made = await createProfile({ name: 'ada', ...IDENTITY }, home)
  await writeIdentity(made, { ...IDENTITY, soul: '  \n ' })

  expect((await findProfile('ada', home))?.soul).toBe(DEFAULT_SOUL)
})
