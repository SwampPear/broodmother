# .agents

Shared agent context for this repo.

- `LESSONS.md` — mistakes agents have made more than once, and what to do instead. Read it
  before starting work; add to it when you catch yourself repeating a correction. Applies
  to every agent and every app here.
- One file or directory per agent other than Claude Code, named after it — `codex.md`,
  `cursor/`, and so on.

Claude Code's own context lives in `../.claude/CLAUDE.md`.

## Rules

- Per-agent files are tool-specific only. Anything true for every agent goes in
  `.claude/CLAUDE.md`, in `LESSONS.md`, or in the app's own README/DESIGN, and the agent
  file points at it rather than restating it.
- A lesson that only holds for one app belongs in that app's docs, not in `LESSONS.md`.
- Where a tool insists on a file at the repo root (`AGENTS.md`, `.cursorrules`), keep the
  real content here and leave a symlink or one-line pointer at the root.
- Checked in. These are shared conventions, not personal settings.
