import { describe, expect, it } from 'vitest'
import { parse, serialize } from './index'

const samples: Record<string, string> = {
  heading: '# One\n\n## Two\n\n### Three\n\n#### Four\n',
  paragraph: 'A plain line.\n\nAnother one.\n',
  softbreak: 'First line\nsecond line.\n',
  marks: '**bold** and *italic* and `code` and ~~struck~~.\n',
  nestedMarks: '**bold with *italic* inside** and *outer **inner** outer*.\n',
  codeInMark: 'See **`config.yaml`** for details.\n',
  link: '[text](https://example.com) and [titled](https://example.com "Title").\n',
  linkMarked: '[**bold link**](https://example.com) and [*italic*](https://x.com).\n',
  linkCode: '[`config.yaml`](https://example.com) holds it.\n',
  image: '![alt](image.png) and ![](bare.png "Title").\n',
  wikilink: '[[Page]] and [[Page|alias]] and ![[embed.png]].\n',
  wikilinkMarked: '**[[Page]]** and *[[Page|alias]]*.\n',
  bulletList: '- one\n- two\n- three\n',
  nestedList: '- one\n  - nested\n  - also\n- two\n',
  orderedList: '1. one\n2. two\n3. three\n',
  orderedStart: '5. five\n6. six\n',
  looseList: '- one\n\n  second paragraph\n\n- two\n',
  taskList: '- [ ] todo\n- [x] done\n',
  taskListNested: '- [ ] todo\n  - detail\n- [x] done\n',
  mixedCheckbox: '- [ ] todo\n- plain\n',
  codeBlock: '```ts\nconst x = 1\n```\n',
  codeBlockBare: '```\nplain\n```\n',
  codeBlockFences: '````\n```\nnested\n```\n````\n',
  blockquote: '> quoted\n>\n> two paragraphs\n',
  blockquoteNested: '> - one\n> - two\n',
  table: '| a | b |\n|---|---|\n| 1 | 2 |\n',
  tableEmptyCell: '| a | b |\n|---|---|\n| 1 | |\n',
  tablePipe: '| a | b |\n|---|---|\n| x \\| y | 2 |\n',
  mathBlock: '$$\nE_\\text{total}(t) = E_0 + \\cfrac{1}{k\\,(t + 1)^{\\alpha}}\n$$\n',
  mathBlockMultiline:
    '$$\nT_{\\text{total}} = N\\left(T_{\\text{step}}\\right), \\qquad\nN = \\left\\lceil \\frac{A}{B} \\right\\rceil\n$$\n',
  mathBlockLatexEscapes:
    '$$\n\\Delta\\log|x| = \\log\\!\\left(|x|_{\\text{after}} / |x|_{\\text{before}}\\right), \\qquad \\Delta\\varphi = \\varphi_{\\text{after}} - \\varphi_{\\text{before}}\n$$\n',
  mathInline: 'where $\\eta$ is the packing ratio, at the supported $L = 30$.\n',
  mathInlineMarked: 'the **$k\\,(t + 1)$** term and *$\\sigma_n$* noise.\n',
  mathAndCurrency: 'A run at $\\eta$ costs $21, or $289–$1.25M a year.\n',
  horizontalRule: 'before\n\n---\n\nafter\n',
  frontmatter: '---\ntitle: A Note\ntags: [x, y]\n---\n\n# Body\n',
  frontmatterOnly: '---\ntitle: A Note\n---\n',
  escapes: 'literal \\*stars\\* and \\[brackets\\] and \\_score\\_.\n',
  escapedLeader: '\\- not a list\n\n\\# not a heading\n',
  beyondSchema: '##### not a heading level we support\n',
  mixed:
    '# Title\n\nIntro with [[Link|an alias]].\n\n- [ ] task\n- [x] other\n\n> note\n\n| k | v |\n|---|---|\n| a | b |\n\n```py\nx = 1\n```\n\n---\n\nEnd.\n',
}

describe('serialize(parse(md)) === md for normalized input', () => {
  it.each(Object.entries(samples))('%s', (_name, md) => {
    expect(serialize(parse(md))).toBe(md)
  })
})

describe('parse(serialize(doc)) deep-equals doc', () => {
  it.each(Object.entries(samples))('%s', (_name, md) => {
    const doc = parse(md)
    expect(parse(serialize(doc))).toEqual(doc)
  })
})

describe('wikilinks', () => {
  it('carries target and alias on a mark', () => {
    expect(parse('[[Page|alias]]\n').content?.[0].content?.[0]).toEqual({
      type: 'text',
      text: 'alias',
      marks: [{ type: 'wikiLink', attrs: { target: 'Page', alias: 'alias' } }],
    })
  })

  it('leaves a bare target aliasless', () => {
    const mark = parse('[[Page]]\n').content?.[0].content?.[0].marks?.[0]
    expect(mark).toEqual({ type: 'wikiLink', attrs: { target: 'Page', alias: null } })
  })

  it('does not swallow ordinary links', () => {
    expect(parse('[a](b)\n').content?.[0].content?.[0].marks?.[0].type).toBe('link')
  })

  it('leaves an unclosed bracket pair as text', () => {
    expect(parse('[[unclosed\n').content?.[0].content).toEqual([
      { type: 'text', text: '[[unclosed' },
    ])
  })
})

describe('frontmatter', () => {
  it('is kept verbatim, unparsed and unreordered', () => {
    const md = '---\nzed: 1\nalpha:   "  spaced  "\n---\n\nBody.\n'
    expect(parse(md).attrs).toEqual({
      frontmatter: '---\nzed: 1\nalpha:   "  spaced  "\n---',
    })
    expect(serialize(parse(md))).toBe(md)
  })

  it('is null, never absent, when the file has none', () => {
    expect(parse('Text\n\n---\n\nMore\n').attrs).toEqual({ frontmatter: null })
  })
})

describe('math', () => {
  it('keeps LaTeX verbatim instead of parsing it as markdown', () => {
    const latex = '\\log\\!\\left(|x|_{\\text{after}} / |x|_{\\text{before}}\\right)'
    const doc = parse(`$$\n${latex}\n$$\n`)
    expect(doc.content).toEqual([
      { type: 'mathBlock', content: [{ type: 'text', text: latex }] },
    ])
    expect(serialize(doc)).toBe(`$$\n${latex}\n$$\n`)
  })

  it('puts the inline form inside a paragraph and the block form beside it', () => {
    expect(parse('text $x$ more\n\n$$\ny\n$$\n').content).toEqual([
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'text ' },
          { type: 'math', content: [{ type: 'text', text: 'x' }] },
          { type: 'text', text: ' more' },
        ],
      },
      { type: 'mathBlock', content: [{ type: 'text', text: 'y' }] },
    ])
  })

  it('keeps a LaTeX thin space verbatim', () => {
    const latex = 'k\\,(t + 1)'
    expect(serialize(parse(`$$\n${latex}\n$$\n`))).toBe(`$$\n${latex}\n$$\n`)
    expect(serialize(parse(`inline $${latex}$ here.\n`))).toBe(
      `inline $${latex}$ here.\n`,
    )
  })

  it('folds a one-line $$…$$ block into the fenced form', () => {
    expect(serialize(parse('$$S = N \\times M$$\n'))).toBe('$$\nS = N \\times M\n$$\n')
  })

  it('leaves prices alone', () => {
    for (const md of ['$289k–$1.25M and $21B\n', 'costs $100–345 in parts\n']) {
      expect(parse(md).content?.[0].content?.every((n) => n.type === 'text')).toBe(true)
      expect(serialize(parse(md))).toBe(md)
    }
  })

  it('needs the delimiters to hug their content', () => {
    expect(parse('a $ x $ b\n').content?.[0].content).toEqual([
      { type: 'text', text: 'a $ x $ b' },
    ])
  })
})

describe('outside the schema', () => {
  it('keeps an unsupported heading level as literal text', () => {
    expect(parse('###### deep\n').content).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: '###### deep' }] },
    ])
  })
})
