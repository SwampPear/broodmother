# 10 · Menus and modals

_uncommitted_

## What changed

- **One dropdown for the whole app.** `apps/web/src/components/menu.tsx` is the only menu
  now. It takes sections of actions and renders one anatomy: a floating surface, groups
  separated by a full-bleed rule, rows carrying a leading visual, a label over an optional
  second line, and a trailing check on whatever is chosen. A section where any row declares
  `selected` becomes a radio group; the rest are plain actions. Rows can also be marked
  `danger` or `disabled`.
- **The behaviour is a library's, not ours.** Menus sit on `@radix-ui/react-dropdown-menu`
  and modals on `@radix-ui/react-dialog` — headless primitives, no styling of their own. That
  buys roving focus, wrap-around arrows, type-ahead, escape, click-away, focus returning to
  the trigger, collision-aware placement, focus trapping, the scroll lock, and an inert
  background, none of which we now maintain. The hand-rolled `aria-activedescendant` listbox
  in the profile dropdown is gone with it.
  - Two new runtime dependencies, against a stack that had none for the UI. They are
    behaviour primitives rather than a component library — they ship no styles and every
    pixel is still ours — but it is a departure worth naming.
- **One modal for the whole app.** `modal.tsx`: dimmed ground, titled header, scrolling body,
  footer for the actions. Passing `onClose` is what makes it dismissable — a modal that has
  to be answered leaves it off and then there is no close button, no escape, and no
  click-away. Mounting it opens it, so callers keep the open/closed decision in their own
  state instead of mirroring it.
- **Adding a profile actually adds a profile.** The row used to push you to `/settings`,
  which edits the live config and knows nothing about profiles — there was no way to create
  one at all. It is now a modal: profile name, git author name and email, and a presence
  colour picked from the opal palette, defaulting to one no existing profile is using.
  A duplicate name and an email with no `@` are both refused in the app's own voice. The new
  profile is created and switched to in one step.
  - A profile is an identity, not a workspace: the vault, remote, and branch you are on carry
    over, and only who you commit as changes. Switching vaults stays its own action.
- **The profile menu reaches settings.** It was the only route to `/settings` from the
  dropdown and it was disguised as "Add a profile…". Both are now their own rows.
- **The divergence dialog is a modal** like everything else, and is the first caller to leave
  `onClose` off — one of the two versions has to win before the session can go on.
- **The command palette and the editor's slash menu** adopt the same surface and row
  treatment. Floating surfaces are the one place the app is not square: `--surface-radius`
  12px on the sheet, `--row-radius` 6px on the rows, a 4px inset, one shadow. Everything else
  stays at `--radius: 0`.
- **Dead CSS removed** — `.mother-slash-menu` had no markup behind it.
- **File-tree rules no longer leak into the sidebar chrome.** `.tree ul` / `.tree li` /
  `.tree .icon` matched anything in the sidebar, and `.tree ul` tied `.profile ul` on
  specificity (0,1,1) while sitting later in the file — so the profile dropdown was styled
  by the file list: `padding: var(--pad) 0` in place of its own, plus `flex: 1`,
  `overflow: auto`, and `opacity: 0.55` on its icons. That is where the panel's lopsided
  ~10px top and bottom gaps came from. Everything under `.tree` is now scoped through
  `> ul`, the list itself. Portalled menus are out of reach of it either way, but the rules
  were wrong for anything else that lands in the head. Two dead rules went with it: a
  duplicated `.icon` block, and an `li[aria-selected]` colour that a later copy of the same
  selector always overrode.
- **The profile trigger is the whole row.** The logo sat outside the button, so the hover
  and open background started 42px in, partway across the head. The logo moved inside, the
  button took over the head's padding (`.profile { padding: 0 }` never applied — plain
  `.tree-head` outranked it on source order), and the initial-on-presence-colour badge came
  off the face. The badge stays on the dropdown rows, where it distinguishes profiles from
  each other; on a trigger that names the one profile you are on, it labelled nothing.

## Notes

- `src/test/setup.ts` stubs pointer capture, `scrollIntoView`, and `ResizeObserver`, which
  jsdom does not implement and a floating surface calls on every open.
- Profiles still live in `localStorage` (`src/profiles.ts`). The contract for moving them to
  folders under `~/.mother/<profile>/` landed in `packages/shared` while this was being
  written; when the server routes exist, the modal's `onCreate` becomes
  `POST /api/profiles` — it already collects exactly `{ name, presenceColor, gitAuthor }`.
  `profiles.ts` was decoupled from the identity fields that left `MotherConfig` so the web
  app keeps building through that migration.

## Tests

`menu.test.tsx` (6), `modal.test.tsx` (6), `add-profile.test.tsx` (7), and a rewritten
`profile-menu.test.tsx` (9). 86 passing in `@mother/web`.
