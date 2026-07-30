# Style

How code in this repo is written. Every package, every agent.

Simplicity is the whole philosophy — not a preference among others, and the tiebreaker
whenever two of these rules pull apart.

## Shape

Minimal and elegant. The shortest thing that is still obvious wins. Delete before you add,
and leave nothing behind that nothing calls.

Every area is a folder: `core.ts` holds its base, siblings sit beside it, and `index.ts`
names what leaves. Cross-folder imports go through the barrel; inside a folder, files
import each other directly. Named exports only.

## TypeScript

`interface` for object shapes. `type` only for what an interface cannot say — unions,
aliases, mapped and conditional types.

`function` declarations for everything. Arrows only where one is required: callbacks and
inline expressions.

`import type` for types. No `any`, no `!` outside tests, no cast that a better type would
have removed.

## Comments

Effectively none. A name that needs a comment is the wrong name, and a function that needs
a paragraph is two functions.

The exception is a fact the code cannot state — a protocol requirement, a workaround and
why, a regex nobody can read back. One line, above the thing it explains. Prose left over
from earlier versions comes out as files are touched.

## Formatting

Prettier decides: no semicolons, single quotes, 90 columns, trailing commas. Run
`npm run format`. Never hand-format around it.

## Naming

Files and folders are lowercase, kebab for more than one word. `core.ts` is a folder's base
module and `index.ts` is only ever a barrel.

## Tests

Vitest, beside the code as `*.test.ts` — `packages/editor` still keeps its own in
`__tests__/`. Test behaviour through a module's public surface, not its internals.
