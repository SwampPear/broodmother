# 13 · Tabs, and a profile you can delete

`d4ca390`

## What landed

The pane got a tab strip, first run stopped being a screen of its own, a profile can be
removed from the menu that lists them, and ⌘B/⌘I do what they do everywhere else.

## Tabs

`TabStrip` sits across the top of the main pane and holds two kinds of tab:

- **A document tab is a place in the vault**, so the URL stays the source of truth. Opening
  a document — from the tree, the palette, a link, or a reload onto a URL — is what puts a
  tab there, and picking one routes rather than swapping a pane. Nothing to keep in sync
  because there is only one copy of the answer.
- **A terminal tab is a running shell** that takes the whole pane. It stays mounted behind
  whatever is on top, because a pty that unmounts is a pty that dies, and it closes itself
  when the shell exits. `Shell` holds one piece of state for this — which terminal tab is
  up, if any — and the route decides everything else.

The ⌘J panel at the bottom is untouched: same `Session` underneath, two ways to reach a
shell. The document header went with the strip — `doc-head` said the filename a second time
and cost a band of chrome across every note to do it.

## First run is the app, empty

`ProfileSetup` and the full-screen vault picker are gone. Both are modals over the home
now, which renders empty behind them rather than being replaced:

- No profile → the add-profile modal with no `onClose`, so no cancel, no escape, no
  click-away. Same form as the one on the profile menu, with first-run copy.
- Profile but no vault → the picker, as a modal, on the same terms.

Neither opens until `app.ready`, so a profile that exists is never asked to introduce
itself on the way past. This replaces [12](12-first-run-polish.md)'s "render nothing until
the answers are in" — the home is safe to show immediately once it is not competing with a
screen that replaces it.

## Deleting a profile

Double-clicking a profile in the menu drills into that profile's options in the same
surface. A dropdown row has one gesture spare and switching profile is not what you meant
by a second click, so `MenuAction` grew `onSecondClick`: a row that has one holds its
select for 200ms and does not close the menu, since closing on the first click leaves the
second landing on nothing.

Delete is the only option there. It is a folder and everything in it — vaults, git history,
anything unpushed — so it goes through a confirmation naming the exact path. `DELETE
/api/profiles` removes the folder, taking the path from the listing rather than the name so
what is deleted is always a folder in the home. Deleting the profile you are in falls back
the way startup does: whatever is left, else none, which is the first-run state again.

## Right-clicking a file

The tree's three commands — new, rename, delete — were bound to `n`, `r` and `d` on the
focused row and reachable no other way, which is no use to anyone who did not already know
they were there. Right-clicking a row now opens them.

`@radix-ui/react-context-menu` came in for it, the sibling of the dropdown already here, so
the anchor is the only thing that differs: the rows are the same `MenuRow`, the same
`MenuSection[]`, the same surface, and dismissal, roving focus and type-ahead stay someone
else's problem. Delete carries the danger colour and still routes through
`onCommand('delete', path)` — the same confirmation flow the key opens, not a second one.

## Smaller

- **Settings cannot retype the vault path or its remote.** Both are settled when the vault
  is created and read from it afterwards; typing a new one pointed mother at a folder it
  had never cloned. They are read-only with a line saying to make a new profile instead.
- **⌘B and ⌘I** wrap the selection, unwrap it when it is already wrapped — markers inside
  the selection or just outside it — and leave the cursor between a fresh pair when nothing
  is selected. Asterisks come in runs, so italic is on when the run is odd and bold when
  there are at least two: ⌘I over `**word**` gives `***word***` rather than tearing a
  marker off the bold.
- **Chrome.** Every button takes the shape of the one that creates a profile. Tree rows are
  inset with a soft corner and a hair of space between them; the guides are lifted over the
  row backgrounds that were painting across them, and mixed into the ground rather than
  left translucent, so a line is the same colour over a hovered row as over a plain one.
- **A shell opens in the profile you are working as**, not in the mother home above it —
  and asks per shell rather than holding the path, so switching profile moves where the
  next one starts. The home is only the answer on first run, when there is no profile to
  stand in.
- **The delete confirmation is a question, not a form.** It was as wide as the command
  palette with two full-width buttons stacked down it. Narrower, cancel and delete side by
  side at the end of the row, delete in the danger colour.

## Not done here

- Tabs are per session. A reload reopens the tab for the URL you are on and nothing else.
- A terminal tab is always a plain login shell — the panel's claude tab has no equivalent
  in the strip yet.
