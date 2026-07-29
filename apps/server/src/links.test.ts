import { afterAll, describe, expect, it } from 'vitest'
import { cleanup, tempDir } from './fixtures'
import { LinkIndex, extractLinks, resolveTarget, rewriteLinks } from './links'
import { Vault } from './vault'

afterAll(cleanup)

const documents = [
  'ECSEQ-1/Whitepaper/Whitepaper.md',
  'ECSEQ-1/Risks.md',
  'Business/Roadmap.md',
  'index.md',
]

async function indexed(files: Record<string, string>) {
  const vault = new Vault(await tempDir())
  for (const [path, contents] of Object.entries(files)) await vault.write(path, contents)
  const links = new LinkIndex(vault)
  await links.rebuild()
  return { vault, links }
}

describe('extractLinks', () => {
  it('finds wikilinks with aliases, headings and block refs', () => {
    const links = extractLinks('see [[Whitepaper|the paper]] and [[Risks#Kill criteria]]')
    expect(links.map((l) => l.target)).toEqual(['Whitepaper', 'Risks'])
    expect(links[0]!.context).toBe(
      'see [[Whitepaper|the paper]] and [[Risks#Kill criteria]]',
    )
  })

  it('finds relative markdown links and skips external ones', () => {
    const links = extractLinks(
      '[a](ECSEQ-1/Risks.md) [b](https://example.test) [c](#anchor)',
    )
    expect(links.map((l) => l.target)).toEqual(['ECSEQ-1/Risks.md'])
  })

  it('decodes percent-escaped paths', () => {
    expect(extractLinks('[x](ECSEQ-1/Peripheral%20Device.md)')[0]!.target).toBe(
      'ECSEQ-1/Peripheral Device.md',
    )
  })
})

describe('resolveTarget', () => {
  it('prefers an exact path, then a filename, then a filename without extension', () => {
    expect(resolveTarget('ECSEQ-1/Risks.md', documents)).toBe('ECSEQ-1/Risks.md')
    expect(resolveTarget('ECSEQ-1/Risks', documents)).toBe('ECSEQ-1/Risks.md')
    expect(resolveTarget('Roadmap.md', documents)).toBe('Business/Roadmap.md')
    expect(resolveTarget('Whitepaper', documents)).toBe(
      'ECSEQ-1/Whitepaper/Whitepaper.md',
    )
    expect(resolveTarget('Nothing', documents)).toBeNull()
  })
})

describe('LinkIndex', () => {
  it('exposes backlinks and outbound links', async () => {
    const { links } = await indexed({
      'index.md': 'start at [[ECSEQ-1/Risks]]',
      'Business/Roadmap.md': 'risk register: [[Risks]]',
      'ECSEQ-1/Risks.md': '# Risks',
    })

    expect(
      links
        .backlinks('ECSEQ-1/Risks.md')
        .map((b) => b.from)
        .sort(),
    ).toEqual(['Business/Roadmap.md', 'index.md'])
    expect(links.outbound('index.md')).toEqual([
      { from: 'index.md', to: 'ECSEQ-1/Risks.md', context: 'start at [[ECSEQ-1/Risks]]' },
    ])
    expect(links.backlinks('index.md')).toEqual([])
  })

  it('rewrites links in every document on a rename', async () => {
    const { vault, links } = await indexed({
      'index.md': 'see [[Risks]] and [[ECSEQ-1/Risks]] once',
      'Business/Roadmap.md': 'and [a](ECSEQ-1/Risks.md)',
      'Business/Funding.md': 'no links here',
      'ECSEQ-1/Risks.md': '# Risks',
    })

    await vault.move('ECSEQ-1/Risks.md', 'ECSEQ-1/Risks and Kill-Criteria.md')
    const rewritten = await links.rewriteForMove(
      'ECSEQ-1/Risks.md',
      'ECSEQ-1/Risks and Kill-Criteria.md',
    )

    expect(rewritten).toBe(2)
    expect(await vault.read('index.md')).toBe(
      'see [[Risks and Kill-Criteria]] and [[ECSEQ-1/Risks and Kill-Criteria]] once',
    )
    expect(await vault.read('Business/Roadmap.md')).toBe(
      'and [a](ECSEQ-1/Risks%20and%20Kill-Criteria.md)',
    )
    expect(await vault.read('Business/Funding.md')).toBe('no links here')
    expect(links.backlinks('ECSEQ-1/Risks and Kill-Criteria.md')).toHaveLength(3)
  })

  it('tracks a document created after the initial index', async () => {
    const { vault, links } = await indexed({ 'ECSEQ-1/Risks.md': '# Risks' })
    await vault.write('new.md', 'points at [[Risks]]')
    await links.update('new.md')
    expect(links.backlinks('ECSEQ-1/Risks.md').map((b) => b.from)).toEqual(['new.md'])

    links.forget('new.md')
    expect(links.backlinks('ECSEQ-1/Risks.md')).toEqual([])
  })
})

describe('rewriteLinks', () => {
  it('leaves links that pointed somewhere else alone', () => {
    const markdown = '[[Risks]] and [[Roadmap]]'
    expect(
      rewriteLinks(markdown, 'Business/Roadmap.md', 'Business/Plan.md', documents),
    ).toBe('[[Risks]] and [[Plan]]')
  })
})
