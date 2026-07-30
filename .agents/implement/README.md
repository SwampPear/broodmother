# Implementation

From a request to a finished change. Four phases, kept apart on purpose: an agent that
reads and edits at once invents facts, and one that builds and verifies at once declares
success without evidence.

Implementation notes for a single package live beside that package. This folder is for
what holds everywhere.

## 1. Explore

Read before writing. Find the code that already does something like this, the types it
speaks in, the tests around it. Name the files you will touch. This is the cheap phase,
and it is what stops a second implementation of something the repo already has.

## 2. Plan

Say what changes, file by file, before changing any of it — including the edge cases and
what you are deliberately not doing. A plan nobody could disagree with is not a plan.

Agree it first when the change adds a dependency, alters a package's public surface, or
moves data on disk. Everything else is yours to decide.

## 3. Build

Follow the plan. If it turns out wrong, say so and re-plan rather than quietly diverging.

- **Smallest diff that does the job.** Touch what the change needs and nothing else. No
  drive-by refactors, no reformatting unrelated lines — they bury the real change.
- **Simplest version first.** Write it directly. Extract an abstraction when a second
  caller exists, never in anticipation of one.
- **Finish it.** No `TODO`, no dead branch kept for later, no half-migrated callers. If
  part of the work is genuinely blocked, complete the rest and say plainly what was left
  and why.
- `STYLE.md` binds while you write, not as a cleanup pass afterwards.

## 4. Verify

`npm run check`, then run the thing you changed and watch it do what it should — a green
suite is not a demonstration.

Report what you ran and what it printed. If tests fail, say so with the output. If you
skipped a step, say that. When it is done and verified, say so plainly without hedging.

Then review it: `../REVIEW.md`, in fresh context.
