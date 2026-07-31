# 08 — Git credentials

_Built. This file is the record of why it looks like this._

## Context

Setting git up in broodmother used to mean leaving broodmother: generate a key in a
terminal, register it in a browser, type the path back into a field. Three tools for one
question, and no way to find out whether any of it worked until a sync failed with `auth`.

The first draft of this plan replaced that with GitHub OAuth — device flow, a token in the
Keychain, SSH removed. Two findings killed it before a line was written.

**Credential helpers already work.** Tested with the app's exact environment:

```
GIT_TERMINAL_PROMPT=0 GIT_ASKPASS=true git -c credential.helper=<probe> credential fill
→ HELPER CALLED with get
```

Those two variables stop _interactive prompting_; they do not stop the helper chain. And
`credential.helper=osxkeychain` ships configured system-wide with the Xcode command line
tools:

```
/Library/Developer/CommandLineTools/usr/share/git-core/gitconfig  credential.helper=osxkeychain
```

So anyone who has pushed from a terminal is already authenticated inside broodmother, with
no code at all. The app was not missing a credential mechanism.

**A token would have been defeated by the user's own gitconfig.** A `~/.gitconfig` with

```
url.git@github.com:.insteadof = https://github.com/
```

rewrites every HTTPS GitHub URL to SSH before git asks anyone for a credential. A GitHub
token is an HTTPS credential; on a machine configured that way it would never be consulted.
This is a common setup, and no amount of OAuth survives it.

So: inherit what the machine has, and spend the effort on the two places where that is
invisible instead.

## What was built

### 1. Stop narrowing ssh — `apps/server/src/git/core.ts`

`sshCommand()` passed `-oIdentitiesOnly=yes` when a profile named a key. That turns off the
agent and every other key, so naming a key made authentication _worse_ than leaving the
field blank — the profile could then reach only what that one key opened.

```diff
- return keyPath ? `${batch} -oIdentitiesOnly=yes -i "${expandHome(keyPath)}"` : batch
+ return keyPath ? `${batch} -i "${expandHome(keyPath)}"` : batch
```

The key is added to what ssh already offers. `BatchMode` stays: there is no terminal here
to answer a passphrase prompt, so a key that needs one has to fail rather than hang.

This is the whole of tier one. Everything else about inheriting was already true.

### 2. Say which failure it is — `Git.checkAccess()`, `POST /api/git/check`

`AccessState` is one of `no-repo`, `no-remote`, `ok`, `offline`, `auth`, `other`, and each
comes with a sentence. `auth` splits on the remote's shape, because an SSH remote and an
HTTPS one fail identically and are fixed differently:

- SSH → the remote refused your key; broodmother offers the agent, `~/.ssh`, and the
  profile's key. Make one below and add it to your host.
- HTTPS → broodmother uses this machine's credential helper, so `git push` once from a
  terminal is what fills it.

`check access` in Settings replaces `test remote`, which took a URL and a branch the UI had
just read off the state anyway and answered `ok: false` with a classifier name.

### 3. Make a key — `generateKey()`, `POST /api/profiles/key`

`ssh-keygen -t ed25519` into `<profile>.key` beside the profile's own JSON, the profile
pointed at it, and the **public** half returned. Settings shows it with a copy button and
links straight to GitHub's and GitLab's add-a-key pages.

- ed25519 because the public half is one short line, which is the line being pasted.
- No passphrase: git runs here with no terminal to answer a prompt, so a passphrase would
  make a key that cannot be used rather than a key that is safer. The file's protection is
  0600 in the broodmother home.
- Refused when one already exists — replacing a key silently takes away access to
  everything the old one opened.
- Only ever the public half crosses the wire.

The copy leads with _most people need nothing here_, because most people do not.

## Why not a pasted token

|                           | generated key    | personal access token           |
| ------------------------- | ---------------- | ------------------------------- |
| Expiry                    | never            | 30/60/90 days, then it breaks   |
| Choices to get wrong      | none             | classic vs fine-grained, scopes |
| Secret shown on screen    | no — public half | yes, pasteable and leakable     |
| `git@github.com:` remotes | works            | never consulted                 |
| An `insteadOf` rewrite    | works            | never consulted                 |

## What this does not do

- **Non-GitHub hosts** get the generated key and the GitLab link; anything else is a paste
  into a page we do not name.
- **Nothing is detected.** If you have a working agent, broodmother uses it and says nothing
  about it — `check access` is how you find out, and you have to ask.
- **No Linux path for the copy.** The key generation is `ssh-keygen`, which is everywhere,
  but the credential-helper sentence names what macOS ships.

## Verification

`npm run check` — 622 pass. Beyond the unit tests:

- `apps/server/src/git/core.test.ts` — each of the four answers off a real repository, and
  that the ssh and https advice never read the same.
- `apps/server/src/app.test.ts` — the key is generated, the profile points at it, the
  private half stays on disk, and a second attempt is refused.
- `apps/web/src/components/settings/core.test.tsx` — the check reports its answer, and the
  copy says the machine's own credentials are used before it offers the button.
