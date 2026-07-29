# Proprium Labs — LaTeX templates

Official document class and starter templates for **research papers**,
**long-form whitepapers**, **public announcements**, and **letters / memos**,
built to the Proprium brand system
(Funnel Display / Funnel Sans / Ubuntu Mono, **pure-white** page, ink `#1f1f1f`,
opalescent accent palette). This is the standard location for any LaTeX
templates — copy the relevant subdirectory to start a new document. Actual
documents with real content (e.g. the ECSEQ whitepaper at `../whitepaper/`) live
outside this directory and symlink `proprium.cls`/`fonts/` back in from here.

## Putting this in Overleaf

You have the whole project as `proprium-template.zip`. There are two ways in.

### Option A — upload the zip as a new project (easiest)

1. Go to **overleaf.com** and sign in.
2. On the **Projects** dashboard click **New Project → Upload Project**.
3. Drag in **`proprium-template.zip`** (upload the zip itself — Overleaf unpacks
   it, keeping the `fonts/` folder intact). Don't unzip it first.
4. Overleaf opens the project. In the file tree you should see `proprium.cls`,
   the `fonts/` folder, and the three `.tex` files.
5. Set the engine: **Menu (top-left) → Settings → Compiler → XeLaTeX**.
   (LuaLaTeX also works. **pdfLaTeX will not** — the fonts need XeLaTeX/LuaLaTeX.)
   The `% !TEX program = xelatex` line at the top of each `.tex` usually makes
   Overleaf pick this for you, but set it manually if a compile fails.
6. Open `paper.tex` (or `announcement.tex` / `letter.tex`) and click
   **Recompile**. To choose which file the green button builds, use
   **Menu → Main document**.

### Option B — add the template to an existing project

1. In your project, click the **upload icon** at the top of the file tree.
2. Upload `proprium.cls` and your `.tex` file to the project root.
3. Create a folder called **`fonts`** (New Folder), open it, and upload **all 19
   `.ttf` files** from this bundle's `fonts/` directory into it. The folder must
   be named `fonts` and sit next to your `.tex` (the class loads
   `fonts/FunnelSans-Regular.ttf` etc. by relative path).
4. Set **Compiler → XeLaTeX** as above, then put
   `\documentclass[report]{proprium}` at the top of your document and recompile.

### If it doesn't compile

- **"Font ... cannot be found" / many font errors** → the compiler is still on
  pdfLaTeX. Switch to **XeLaTeX** (Menu → Settings → Compiler).
- **Same font error on XeLaTeX** → the `fonts/` folder isn't at the project root,
  is misnamed, or some `.ttf` files are missing. Re-upload all 19 into a folder
  named exactly `fonts`.
- **"Unknown option paper"** → use `report`, not `paper`, as the mode
  (see *Modes* below).

The fonts ship in `fonts/` (Funnel Display + Funnel Sans static cuts instanced
from the Google Fonts variable files, plus Ubuntu Mono), so nothing needs to be
installed system-side — it compiles as-is.

## Layout

Shared assets live at the root; each template gets its own directory and builds
from inside it. `proprium.cls` and `fonts/` are symlinked into each template
directory so there is exactly one canonical copy of each.

```
.
├── proprium.cls          the document class (all styling lives here)
├── fonts/                bundled TTFs
├── README.md
├── paper/                general research-paper template (report mode)
│   ├── paper.tex
│   └── proprium.cls, fonts/       -> symlinks to ../
├── whitepaper/           long-form whitepaper template (teaser, appendices, math)
│   ├── whitepaper.tex
│   └── proprium.cls, fonts/       -> symlinks to ../
└── letter/               letter + announcement templates
    ├── letter.tex        official letter / memo
    ├── announcement.tex  public announcement / press release
    └── proprium.cls, fonts/       -> symlinks to ../
```

To start a new document, copy the relevant template directory elsewhere (or
work in place), rename the `.tex` file, and replace the placeholder content.
Real documents that live outside `latex/` (e.g. `../whitepaper/whitepaper/`)
symlink `proprium.cls`/`fonts/` back to this directory instead of duplicating
them — see that document's own directory for the exact relative path.

Build a document by running `latexmk` from inside its directory:

```sh
cd paper && latexmk paper.tex     # engine/flags come from .latexmkrc
```

> **Overleaf note:** the zip workflow below assumes the old flat layout, where
> `proprium.cls` and `fonts/` sit beside the `.tex`. Symlinks do not survive a
> zip upload — when exporting for Overleaf, copy (don't link) `proprium.cls` and
> `fonts/` into the document directory and upload that directory alone.

## Modes (class options)

```latex
\documentclass[report,11pt]{proprium}            % research paper — STANDARD
                                                 % two-column serif academic
\documentclass[report,onecolumn,11pt]{proprium}  % same paper style, one column
\documentclass[report,brief,11pt]{proprium}      % branded single-column sans
                                                 % (internal memos / one-pagers)
\documentclass[announcement,11pt]{proprium}      % public announcement
\documentclass[letter,11pt]{proprium}            % letter / memo
\documentclass[announcement,dark,11pt]{proprium} % dark cover (#0f0f0f ground)
```

`report` is the default, so `\documentclass{proprium}` gives the standard paper.

The page background is **pure white**. The paper front follows the pi-paper
arrangement: full-width title, then a full-width `\teaser{}` figure, then the
abstract flowing in two columns beneath it (`\begin{abstract}` directly after
`\maketitle` — no minipage needed). The title carries no date line, ink author
and affiliation, and an opal-violet correspondence link by default.

The **paper** (`report`) mode is a conventional academic layout: **two-column,
Times-equivalent serif body** (TeX Gyre Termes, which ships with TeX Live — no
font file needed), with the brand showing up only as small accents. Sectioning
follows the pi-paper / IEEE convention — Roman sections centered in small caps
(`I. Introduction`), lettered subsections in italic (`A. Overview`), numbered
run-in subsubsections (`1) Input representation:`) — with opal-violet section
numbers, opal-rose citations / cross-references / links, a short iridescent rule
under the title, and the two-tone mono figure labels. Cross-references print as
`II-D`, so a `\sect`-style helper that takes dotted decimals should convert. Use `figure*` / `table*` for full-width floats that span both columns
(see the table/figure in `paper.tex`). `brief` reverts to the earlier branded sans
one-pager; `dark` can be combined with any mode. (There is intentionally **no**
`paper` option — that word collides with the geometry package; use `report`.)

## Title metadata

```latex
\title{...}     \subtitle{...}      \eyebrow{Technical Report}
\author{...}    \affiliation{...}   \contact{name@proprium.example}  % shown as link
\docref{PL-TR-2026-014}             \date{June 27, 2026}
\teaser{ \includegraphics{fig.png}\captionof{figure}{...}\label{fig:f} } % optional
\maketitle      % renders the right title block for the mode

\begin{abstract} ... \end{abstract}  % paper mode: run-in "Abstract —" lead
\keywords{...; ...; ...}             % paper mode: run-in "Keywords —" line
```

## Components

| Command / env | Purpose |
| --- | --- |
| `\opalrule[2pt]` | full-width iridescent gradient rule (silicon-sheen signature) |
| `\centeropalrule[2.1in]` | short centered version (used under paper titles) |
| `\teaser{...}` | full-width figure under the title; abstract then flows two-column beneath it (pi-paper front) |
| `\propriumwordmark` | typographic wordmark with gradient chip mark |
| `\propmark` | the small gradient chip mark on its own |
| `\eyebrowfmt{...}` | tracked mono uppercase category label |
| `\twotone{Keyword}{qualifier}` | two-tone mono label (keyword ink + qualifier muted) |
| `\gold{} \violet{} \muted{}` | inline accent colors |
| `\hl{...}` | soft gold text highlight |
| `\code{...}` | inline Ubuntu Mono |
| `keybox[Title]` env | warm callout panel, violet left bar (use sparingly in papers) |
| `specbox[...]` env | mono spec / data panel, cyan bar |
| `propabstract` env | abstract panel (branded `brief` mode) |
| `\pullquote{...}` | large light-weight pull quote |
| `\aboutblock{} \contactblock{}` | announcement boilerplate + media contact |
| `\opening \closing \signatureblock \encl` | letter blocks |

Section heads use Funnel Display with opal accents by level
(violet → indigo → cyan), and `\paragraph` (H4) gets the mint run-in tick.
Itemize markers cycle violet → cyan → mint; enumerate numbers are indigo mono.
Links are indigo. Tables: `booktabs` + `\arrayrulecolor{opalGold}` for the
header rule (see `paper.tex`).

## Notes

- Use math mode for the micron sign: `$\mu$m` (the display/sans fonts don't carry
  U+00B5).
- All colors are defined as named `xcolor` colors: `propWhite propBlack propDark
  opalViolet opalIndigo opalCyan opalMint opalGold opalRose` plus derived
  `propMuted propLine propCard`.
- Fonts were built from the upstream OFL/UFL sources (Funnel by Jonny Pinhorn,
  Ubuntu Mono by Canonical). Both licenses permit redistribution; keep the license
  files if you redistribute the bundle.
