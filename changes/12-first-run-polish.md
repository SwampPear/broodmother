# 12 · First run without the flash

`d4ca390`

## What landed

The setup gate stopped flashing the app behind it, and the two screens that can be the
whole window — setup and the vault picker — were made one look.

## The flash

Both gates in `Shell` read `app.config` as a stand-in for "the answers are in":

```tsx
if (app.config && !app.profile) return <ProfileSetup />
```

`config` starts `null` and fills in when `GET /api/config` answers, so for the first frame
both gates were false and the shell rendered — sidebar, tree, status line — and then got
replaced by the setup screen a moment later. The home screen you were never supposed to see
was the default state.

So the provider now says when it has actually heard back. `App` gained `ready`, set once
`GET /api/profiles` and `GET /api/config` have both settled — `allSettled`, because a
failed request is still an answer, and hanging on one would leave the window blank forever.
The shell renders nothing until then, and the profile gate no longer has to infer readiness
from an unrelated request:

```tsx
if (!app.ready) return null
if (!app.profile) return <ProfileSetup />
```

`shell.test.tsx` is the regression: with no profile, the children must not appear before
the setup heading does. It fails against the old gate with "expected document not to
contain element, found `<div>the vault</div>`".

## The look

- **Setup and picker centre in the window.** Neither has chrome around it, so sitting in
  the top-left corner only made sense when a sidebar was there to balance it. Their layout,
  header and action-button rules are now written once for both.
- **Fields are rounder, and answer the cursor.** `--field-radius: 8px` (inputs were square
  — `--radius-sm` is `0`), plus a `--line-hover` border on hover, transitioned.
- **The accent follows the presence colour.** `--accent` defaults to opal violet; the setup
  screen sets it from the swatch you are hovering over — pick navy and the create button is
  navy before you commit to anything — and the picker sets it from the active profile, so
  the button carries over from the screen before it. `ProfileForm`'s `onReady` became
  `onState`, since the caller owns the submit button and now needs its colour too.
- **Two more swatches.** Gold moved to the end of the palette and navy (`#1d4ed8`) joins it.
- **The palette opens where you are.** `opalFrom(hex)` rotates it to lead with a colour, so
  settings starts at the profile's own and the create form starts at the one it is
  proposing. The form rotates once, off the colour it opened on — swatches that reshuffle
  under the cursor as you pick are worse than a palette starting somewhere unexpected.
- **The tree guides sit under the chevrons.** The guide for a level used to land on the
  left edge of the icon above it; it is inset half an icon so it runs through the middle.
- **The resizer is quieter.** Its dashed line and its handle both take `--line-hover` while
  you are on it, a shade up from the border it lands on rather than a bright seam.
- **Placeholders are nobody.** `Ada` / `you@example.com` became `john` /
  `john@example.com`; the git author name still mirrors the profile name you type.

## A document with a space in its name would not open

```
ENOENT: no such file or directory, open
'…/handbook/Business/Blogs/The%20Long%20Way%20Round.docx'
```

Next hands a catch-all route its segments **as they appear in the URL**. Confirmed against
the dev server: `/doc/Business/Blogs/a%20b.md` arrives as
`["Business","Blogs","a%20b.md"]`. `page.tsx` joined those straight into the path it gave
`DocView`, which put it in the query string, and the server opened the name with the escape
still in it. `Shell`'s `currentPath` had always decoded — that is why the row highlighted
correctly while the document behind it 404'd.

The segments are now decoded one at a time, a malformed escape passing through rather than
throwing, so the vault answers "no such document" instead of the page failing to render.

## A test-environment gap

Node 25 hands the jsdom environment a `localStorage` global that is an empty object with
none of the Storage API on it, so anything rendering `Shell` — which reads its pane sizes on
mount — died with `localStorage.getItem is not a function`. `src/test/setup.ts` installs an
in-memory stand-in when the global looks like that, next to the pointer-capture and
`ResizeObserver` stubs already there.
