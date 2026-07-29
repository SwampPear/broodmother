import type { Backlink, VaultPath } from '@mother/shared'
import type { Vault } from './vault'

export interface DocLink {
  kind: 'wiki' | 'md'
  /** The target exactly as written, before resolution. */
  target: string
  raw: string
  context: string
}

const WIKI = /\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g
const MD = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g

function stripExtension(p: string): string {
  return p.replace(/\.md$/i, '')
}

function basename(p: string): string {
  return p.slice(p.lastIndexOf('/') + 1)
}

export function extractLinks(markdown: string): DocLink[] {
  const links: DocLink[] = []
  for (const line of markdown.split('\n')) {
    const context = line.trim()
    for (const match of line.matchAll(WIKI)) {
      const target = match[1]!.split('#')[0]!.split('^')[0]!.trim()
      if (target) links.push({ kind: 'wiki', target, raw: match[0], context })
    }
    for (const match of line.matchAll(MD)) {
      const href = match[1]!
      if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href) || href.startsWith('#')) continue
      const target = decodeURIComponent(href.split('#')[0]!)
      if (target) links.push({ kind: 'md', target, raw: match[0], context })
    }
  }
  return links
}

/** Obsidian resolution: exact path, then filename, then filename without extension. */
export function resolveTarget(
  target: string,
  documents: readonly VaultPath[],
): VaultPath | null {
  const candidates = [...documents].sort(
    (a, b) => a.length - b.length || a.localeCompare(b),
  )
  const exact = candidates.find((p) => p === target || p === `${target}.md`)
  if (exact) return exact
  const byName = candidates.find((p) => basename(p) === target)
  if (byName) return byName
  const bare = stripExtension(target)
  return candidates.find((p) => stripExtension(basename(p)) === bare) ?? null
}

export class LinkIndex {
  private documents: VaultPath[] = []
  private outboundByDoc = new Map<VaultPath, Backlink[]>()

  constructor(private readonly vault: Vault) {}

  async rebuild(): Promise<void> {
    this.documents = await this.vault.documents()
    this.outboundByDoc.clear()
    for (const document of this.documents) {
      const markdown = await this.vault.read(document).catch(() => null)
      if (markdown !== null) this.index(document, markdown)
    }
  }

  private index(document: VaultPath, markdown: string): void {
    const resolved: Backlink[] = []
    for (const link of extractLinks(markdown)) {
      const to = resolveTarget(link.target, this.documents)
      if (to && to !== document)
        resolved.push({ from: document, to, context: link.context })
    }
    this.outboundByDoc.set(document, resolved)
  }

  async update(document: VaultPath): Promise<void> {
    if (!this.documents.includes(document)) this.documents.push(document)
    const markdown = await this.vault.read(document).catch(() => null)
    if (markdown === null) this.forget(document)
    else this.index(document, markdown)
  }

  forget(document: VaultPath): void {
    this.documents = this.documents.filter((p) => p !== document)
    this.outboundByDoc.delete(document)
  }

  outbound(document: VaultPath): Backlink[] {
    return this.outboundByDoc.get(document) ?? []
  }

  backlinks(document: VaultPath): Backlink[] {
    const found: Backlink[] = []
    for (const links of this.outboundByDoc.values())
      for (const link of links) if (link.to === document) found.push(link)
    return found
  }

  /** Rewrites every link that pointed at `from`; returns how many documents changed. */
  async rewriteForMove(from: VaultPath, to: VaultPath): Promise<number> {
    const before = [...this.documents]
    const sources = new Set(this.backlinks(from).map((link) => link.from))

    let rewritten = 0
    for (const source of sources) {
      const markdown = await this.vault.read(source).catch(() => null)
      if (markdown === null) continue
      const next = rewriteLinks(markdown, from, to, before)
      if (next === markdown) continue
      await this.vault.write(source, next)
      rewritten++
    }
    await this.rebuild()
    return rewritten
  }
}

export function rewriteLinks(
  markdown: string,
  from: VaultPath,
  to: VaultPath,
  documents: readonly VaultPath[],
): string {
  let result = markdown
  for (const link of extractLinks(markdown)) {
    if (resolveTarget(link.target, documents) !== from) continue
    const replacement =
      link.kind === 'wiki'
        ? link.raw.replace(link.target, wikiTarget(link.target, to))
        : link.raw.replace(/\(([^)\s]+)/, `(${encodeURI(to)}`)
    result = result.split(link.raw).join(replacement)
  }
  return result
}

/** Keep the shape the author wrote: a bare filename stays a bare filename. */
function wikiTarget(oldTarget: string, to: VaultPath): string {
  return oldTarget.includes('/') ? stripExtension(to) : stripExtension(basename(to))
}
