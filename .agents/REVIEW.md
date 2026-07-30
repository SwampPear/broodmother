# Review

Mechanical correctness is already covered: `npm run check` runs the type checker and every
test, and prettier settles formatting. A review that reports what those would have caught
is noise. Review meaning.

## Posture

Review the artifact, not the story behind it. If you wrote the code, start a fresh context
before reviewing it — the reasoning that produced a mistake will not find it. Read the code
itself rather than the diff and the docs, following calls into the functions they land in
and out to the callers that would break.

Claims are not findings. A suspected bug gets executed, reproduced, and reported with the
failing output or the exact input that triggers it. If you cannot reproduce it, say so and
label it unverified. Say what you did not check — paths skipped, things you could not run,
assumptions made. A review that hides its gaps reads as coverage it does not have.

## What to look for

In severity order.

**Behaviour against intent.** Does it do what was asked, including the case nobody
mentioned — empty input, first run, the failure path, the second call? Code that passes its
tests can still violate the thing it was written for.

**Dead code.** The most common defect in generated code and the easiest to skip past.
Exports nobody imports, branches nothing reaches, parameters no one reads, a helper with a
single caller, a file left behind by a move, anything commented out. Grep the symbol: if
the only hits are its definition and a barrel re-exporting it, it is dead. Nothing is wired
up to find this — do it by hand, and delete rather than deprecate.

**Complexity nobody is paying for.** A function doing two things, nesting past two levels,
a boolean parameter that splits a body in half, an abstraction with one implementation, a
wrapper that only forwards, state that could be derived instead of stored. For each, write
out what the direct version would look like. If it is shorter and clearer, that is the
finding.

**A second spelling of something that exists.** Reuse or unify it; do not leave two.

**Style.** Only actual violations of `STYLE.md` — a comment restating the code, `const f =
() =>` where a `function` belongs, `type` where an `interface` fits, an import reaching
past a folder's `index.ts`.

## Reporting

Severity order, and for each:

1. **What is wrong** — the behaviour or contract broken, in one sentence.
2. **Why it matters** — the concrete failure, not "could be an issue".
3. **The fix** — the change you would make.
4. **How it stays fixed** — the test, where one is warranted.

"No real problems found" is a valid result. Never pad a review to look thorough.
