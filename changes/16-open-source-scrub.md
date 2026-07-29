# 16 · Open-source scrub

_uncommitted_ — README rewrite, MIT licence, private corpus removed

## What changed

mother was written inside a company monorepo, against that company's vault, and it showed:
the fixtures were that vault, the test data was that company's documents, and the README
addressed colleagues rather than readers. This chunk makes the repo standalone so it can be
released.

### The corpus is gone

`packages/markdown/fixtures/` held 89 verbatim pages from a private vault — a whitepaper,
patent drafts, an inventor assignment agreement, funding applications, competitor research.
`corpus.test.ts` ran the codec over all 89. Both are deleted, and the files are removed from
the index as well as from disk.

That costs the at-scale check described in [02](02-markdown-codec.md). `roundtrip.test.ts`
still covers every construct the schema claims, one sample each, so the codec is not
untested — but the "real documents, not fixtures written to be easy" property is not
replaceable with invented files, and inventing 89 of them to keep a number honest would
have been theatre. The gap is stated rather than papered over.

**This does not scrub the git history.** Every deleted file is still reachable in earlier
commits. Publishing this repo with its history intact republishes the vault; that is a
separate decision and a separate operation (`git filter-repo`, or a fresh initial commit).

### Placeholders are placeholders

Every test, mock and doc that named the company, its product, its people or its documents
now names nobody: `Handbook/Overview.md` for vault paths, `acme` for a project, `handbook`
for a vault, `ada` / `grace` at `example.com` for profiles. The LaTeX samples in
`roundtrip.test.ts` were rewritten to keep every escape sequence they were testing
(`\!`, `\,`, `\left`, `_{\text{…}}`) while dropping the physics they came from.

Two consequences worth knowing:

- `live-preview.test.ts` asserts on character offsets into a sample string, so renaming the
  sample moved them. The offsets were corrected, not the assertion.
- `listVaults` returns names sorted, so renaming a fixture vault reordered the expectation.

### README

Rewritten as a project README rather than a team memo: pitch, badges, architecture,
requirements, install, environment variables, layout, scripts, contributing, licence. The
code-style and git conventions moved under Contributing rather than being deleted, since
`.claude/CLAUDE.md` points at them. The dead `DESIGN.md` link is gone; the file was already
deleted.

`LICENSE` is MIT, © Michael Vaden.

## What was not done

- The git history, as above.
- The fonts and the opal palette stay. They are open-licensed typefaces and seven hex
  values; the comment naming them as brand assets is what was removed.
