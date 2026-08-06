import { describe, expect, it } from 'vitest'
import { brief, type BriefState } from './core'
import { DEFAULT_SOUL } from './soul'

const VAULT = '/Users/tester/.broodmother/tester/handbook'

const STATE: BriefState = {
  api: 'http://127.0.0.1:3001',
  profile: 'tester',
  soul: null,
  vault: { name: 'handbook', path: VAULT, checkout: `${VAULT}/local` },
  projects: [
    { name: 'api', path: `${VAULT}/api/local` },
    { name: 'pipeline', path: `${VAULT}/pipeline/local` },
  ],
  skills: [],
  scope: 'project:api',
  cwd: `${VAULT}/api/local`,
  sync: 'off',
}

describe('brief', () => {
  it('names the vault, every project and where the shell is standing', () => {
    const text = brief(STATE)

    expect(text).toContain('vault    handbook — ~/.broodmother/tester/handbook')
    expect(text).toContain('project api')
    expect(text).toContain('project pipeline')
    expect(text).toContain('scope    project:api')
    expect(text).toContain('cwd      ~/.broodmother/tester/handbook/api/local')
  })

  it('marks the tree the shell is in, and only that one', () => {
    const inProject = brief(STATE)
      .split('\n')
      .filter((line) => line.includes('you are here'))
    expect(inProject).toHaveLength(1)
    expect(inProject[0]).toContain('project api')

    const inVault = brief({ ...STATE, scope: 'vault', cwd: `${VAULT}/local` })
    const marked = inVault.split('\n').filter((line) => line.includes('you are here'))
    expect(marked).toHaveLength(1)
    expect(marked[0]).toContain('vault')
  })

  /* The editor soft-wraps, so a paragraph hard-wrapped to a terminal's width reads back
     full of stray newlines — the one writing habit worth spelling out to every agent. */
  it('tells an agent to write whole paragraphs and leave the wrapping to the editor', () => {
    const text = brief(STATE)

    expect(text).toContain('Write each paragraph as one long line')
    expect(text).toContain('Never hard-wrap prose at a column width')
  })

  it('says so when no vault is open, and lists no trees', () => {
    const text = brief({ ...STATE, vault: null, projects: [], profile: null })

    expect(text).toContain('none is open yet')
    expect(text).not.toContain('The trees')
    expect(text).toContain('You are running in a terminal inside broodmother')
  })

  it('puts a written soul under the one heading, in place of the default', () => {
    const text = brief({ ...STATE, soul: "# Rules\n\nDon't be cheerful.\n" })

    expect(text).toContain("## Who you are\n\n# Rules\n\nDon't be cheerful.")
    expect(text).not.toContain(DEFAULT_SOUL)
  })

  /* A profile that has never been written a soul is every profile on a fresh machine, so
     the default is what an agent is held to until somebody says otherwise — under the same
     heading a written one gets, being the same thing. */
  it('falls back to the default soul, under the same heading', () => {
    for (const soul of [null, '', '  \n ']) {
      const text = brief({ ...STATE, soul })
      expect(text).toContain(`## Who you are\n\n${DEFAULT_SOUL}`)
    }
  })

  /* The routes an agent is handed are a decision, not everything the router answers: a
     prompt that names the device flow or the delete-everything route is a prompt that
     invites them. */
  it('offers the routes the filesystem cannot replace and no others', () => {
    const text = brief(STATE)

    expect(text).toContain('POST   /api/doc/move')
    expect(text).toContain('GET    /api/links')
    expect(text).toContain('GET /api/config')
    expect(text).toContain("curl -s 'http://127.0.0.1:3001/api/links?path=notes/sync.md'")

    expect(text).not.toContain('/api/data')
    expect(text).not.toContain('/api/profiles')
    expect(text).not.toContain('/api/github')
  })

  /* Branching is the app's rather than git's — a worktree an agent adds itself is a folder
     nothing was ever moved into — so the whole of it is offered, not just the reading. */
  it('hands over the branch routes, not only the ones that read', () => {
    const text = brief(STATE)

    expect(text).toContain('POST   /api/branches ')
    expect(text).toContain('POST   /api/branches/open')
    expect(text).toContain('DELETE /api/branches ')
    expect(text).toContain('GET /api/branches')
  })

  /* An agent has git in the same terminal, so which of the two does a piece of git work is
     the thing to say outright: the routes where there is one, git where there is not. */
  it('sends git work at the routes that do it, and the rest to git', () => {
    const text = brief(STATE)

    expect(text).toContain('run it rather than git')
    expect(text).toContain('/api/sync/now')
    expect(text).toContain('POST /api/sync/clear-conflict')
    expect(text).toContain('POST   /api/git/check')
    expect(text).toContain('GET /api/git ')
    // Nothing syncs a project, so committing in one is git's, and saying so keeps the rule
    // above from reading as "never touch git".
    expect(text).toContain("A project's repository is yours")
  })

  it('says in one word whether the vault syncs', () => {
    expect(brief(STATE)).toContain('sync     off —')
    expect(brief({ ...STATE, sync: 'on' })).toContain('sync     on —')
    expect(brief({ ...STATE, sync: 'conflicted' })).toContain('sync     conflicted —')
  })

  it('names each skill against its description, under the skills path', () => {
    const text = brief({
      ...STATE,
      skills: [
        { name: 'hello', description: 'prove the skills folder works' },
        { name: 'train-model', description: 'submit a training run' },
      ],
    })

    expect(text).toContain('## Skills')
    expect(text).toContain('~/.broodmother/tester/handbook/local/.skills')
    expect(text).toContain('hello')
    expect(text).toMatch(/train-model\s+submit a training run/)
    expect(text).toContain("read a skill's SKILL.md in full")
  })

  it('renders no skills section at all for a vault that carries none', () => {
    expect(brief(STATE)).not.toContain('## Skills')
  })
})
