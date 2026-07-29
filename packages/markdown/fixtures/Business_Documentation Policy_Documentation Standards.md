# Documentation Standards

The documentation policy for Proprium Labs. It defines where documentation lives, how it is organized, who maintains it, and the conventions every page follows. It applies to all prose documentation across the company — technical specs, business material, fabrication notes, and IP.

For a non-technical walkthrough of installing Obsidian, authenticating with GitHub, and syncing the vault, see the repository [[README]].

## Where documentation lives

- All prose documentation lives in this Obsidian vault, `docs/`, inside the `propriumlabs` monorepo. The vault is version-controlled with the rest of the repo, so every change is tracked in git.
- Code-level documentation (READMEs, docstrings, inline comments) stays with the code in each subproject and is not duplicated here. Link out to it where it helps.
- This vault is the single source of truth for specs. Before changing a sensor parameter, the model, simulator physics, or any architectural decision, read the relevant page here first — do not rely on memory.

## Structure

Documentation is organized into five top-level areas, each a folder with a folder note of the same name:

- **ECSEQ-1** — the product: sensor array, peripheral device, whitepaper, IP & patents.
- **Business** — business plan, funding, roadmap, design, and this policy.
- **Engineering** — fabrication processes and machines.
- **Tools** — internal tooling (cloud training, etc.).
- **Research** — references and external links.

A page that has children is a *folder note*: a note sitting next to a folder of the same name, listing its sub-pages at the top. Keep new pages in the area they belong to rather than at the root.

## Conventions

- **One topic per page.** Keep a page focused; split into sub-pages when it outgrows a single coherent subject.
- **Links** between pages use Obsidian wikilinks: `[[Page Name]]`, or `[[Page Name|display text]]` to relabel. Link liberally — connected docs are easier to navigate and maintain.
- **Attachments** (images, PDFs) live in the top-level `attachments/` folder and are embedded with `![[filename]]`. Name files descriptively (`whitepaper-pixel-array.png`, not `image.png`).
- **Tables** are written as Markdown, not pasted as images, so they stay searchable and editable.
- **Headings** start at `#` for the page title and nest from there.
- **Audience:** write for a reader who is technical but new to the project. Define terms or link to [[Definitions]].
- **Status & provenance:** mark proposals, drafts, and unverified claims as such (e.g. "Status: PROPOSAL"), and date them. Distinguish what is built from what is planned.

## Ownership & maintenance

- Each area has an owner responsible for keeping it current.
- Documentation is updated in the same change as the work it describes — a spec change and its doc update land together, not "later."
- **Stale docs are bugs.** If a page contradicts reality, fix it or flag it (a `TODO:` line at the top); do not silently work around it.
- Review the vault structure each milestone to prune dead pages and re-home anything misfiled.

## Confidentiality

- Treat the entire vault as internal and confidential by default.
- IP-sensitive material — everything under ECSEQ-1 → IP & Patents, and any unfiled technical detail — must not be shared externally before counsel review and filing. Public disclosure can forfeit patent rights; see [[Provisional Patent Filing Instructions]].
- The legal and IP pages are internal reference notes, not legal advice.

## Tools

- The vault is meant to be opened in Obsidian, which provides links, search, and the graph view. Because it is plain Markdown in git, any text editor also works.
- Contributors who only need to read or make small edits should follow the repository [[README]].
