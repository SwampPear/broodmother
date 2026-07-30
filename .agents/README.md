# .agents

Shared agent context for this repo. Written by hand, read on demand.

| | |
| --- | --- |
| `STYLE.md` | how code here is written. Read before writing any. Binding. |
| `implement/` | the loop from a request to a finished change. |
| `REVIEW.md` | how code here is reviewed. Read before reviewing any. |
| `LESSONS.md` | mistakes made more than once. Read before starting work. |

Claude Code's own instructions are `../.claude/CLAUDE.md`; `../CLAUDE.md` indexes the
workspace and the commands. One file or directory per other agent, named after it —
`codex.md`, `cursor/`.

## Writing docs in here

Every line of a file an agent always reads is paid for in every session, and a model can
only hold so many instructions before the ones that matter are diluted. So:

- **Short.** 150 lines is the ceiling; nothing here should need half of it. Cut before you
  add.
- **Specific.** "Write clean code" changes nothing. "`interface` for object shapes, `type`
  only for unions" changes the output. A rule that cannot be violated is not a rule.
- **One real example beats three paragraphs.** Show the line, not the principle.
- **Progressive disclosure.** Only what is true for every session belongs in a file every
  session reads. Everything else is its own file, listed above with one line saying when
  to open it.
- **Name the tools.** A command written down gets used; one merely implied does not.
- **By hand.** Never generated from the codebase, and never restating what the code, the
  types or `README.md` already say. A doc that duplicates the repo goes stale and makes
  the agent worse.
- **Grown from mistakes.** Add a rule when an agent got it wrong, not in anticipation.
  Delete rules that stop being true.

## Rules

- Per-agent files are tool-specific only. Anything true for every agent goes in the files
  above, and the agent file points at it rather than restating it.
- A lesson or a note that only holds for one package belongs beside that package.
- Where a tool insists on a file at the repo root (`AGENTS.md`, `.cursorrules`), keep the
  real content here and leave a symlink or a one-line pointer at the root.
- Gitignored. Local context, not shipped.
