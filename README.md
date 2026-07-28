# Solutions

Custom apps the business runs on. One repo, one directory per app.

```
solutions/
├── .claude/     # Claude Code context, agents, commands, settings
├── .agents/     # context for every other agent that works in this repo
└── docs/        # in-house documentation app — local-first Markdown + git + live collab
```

Each app directory owns its own README and DESIGN. Read them before working in that
directory and prefer them over anything assumed here.

- `docs/README.md` — what the docs app is and why it exists
- `docs/DESIGN.md` — architecture, stack, build order

Business-wide context (ECSEQ-1, the vault, chip and model specs) lives in the parent
`propriumbioscience/CLAUDE.md`.

## Agent context

`.agents/` holds shared agent context — see `.agents/README.md` for the layout.

`.agents/LESSONS.md` records mistakes agents have made here more than once. Read it before
starting work. When you catch yourself repeating a correction already made in this repo,
add an entry. Once is a fix; twice is a lesson. Nothing goes in preemptively, and a lesson
that only holds for one app belongs in that app's docs.

Per-agent context (Codex, Cursor, anything else we try) is one file or directory in
`.agents/`, named after the tool, and holds tool-specific guidance only.

## Code style

Write the minimum code that implements what was described — not the minimum that could be
extended to something larger. No speculative abstractions, no options nobody asked for, no
layers with a single caller.

Elegant and short, but never at the cost of readability. Clever beats verbose; clear beats
clever. If shortening a function makes a reader stop and work it out, it was already short
enough.

Comments are close to non-existent. Names, types, and structure carry the meaning. The
exceptions are narrow: a non-obvious *why* (a workaround, a spec quirk, an ordering that
looks wrong but isn't), or a subtlety a reader would otherwise reintroduce as a bug.

Match the file you're in — consistency with the surrounding code outranks everything above.
When a convention isn't obvious, go read what's already here: the nearest code in the same
app, then the other apps in this repo, then the sibling projects in the parent monorepo
(`dodgson/`, `data/`, `strata/`, `website/`). This repo is young, so sometimes there is no
precedent — then make the call and say which convention you established and why.

## Git

No Claude coauthor line in commits. Commit messages are one-liners, and a commit covers one
functional chunk of work.
