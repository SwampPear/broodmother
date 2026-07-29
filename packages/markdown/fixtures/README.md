# Documentation Setup

Set up the docs vault: **Obsidian** to read/edit, **git + GitHub** to sync. Do the steps in order.

Repo: `git@github.com:Proprium-Labs/docs.git` (SSH) · `https://github.com/Proprium-Labs/docs.git` (HTTPS)

## 1 — Install Obsidian

Download from [obsidian.md](https://obsidian.md) and install.

## 2 — Install Git

- **Mac:** run `git --version`; if missing, click **Install** on the developer-tools prompt.
- **Windows:** install from [git-scm.com](https://git-scm.com), accept defaults, use **Git Bash**.
- **Linux:** `sudo apt install git`.

Set your identity once:

```bash
git config --global user.name "Your Name"4
git config --global user.email "you@example.com"
```

## 3 — Authenticate with GitHub

Get an admin to add you to `Proprium-Labs/docs`. Then pick **one**:

**SSH (recommended):**

```bash
ls ~/.ssh/id_ed25519.pub                        # exists? skip to the last line
ssh-keygen -t ed25519 -C "you@example.com" # Return through prompts
pbcopy < ~/.ssh/id_ed25519.pub                  # Windows: clip < ... · Linux: cat
```

Paste the key at **GitHub → Settings → SSH and GPG keys → New SSH key**. Test: `ssh -T git@github.com`. Clone with the SSH URL.

**Token:** **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained** → repo `Proprium-Labs/docs`, **Contents: Read and write** → generate and save the token. Use it as the password when prompted, with the HTTPS URL.

## 4 — Clone

`cd` to any folder, then run one:

```bash
git clone git@github.com:Proprium-Labs/docs.git      # SSH
git clone https://github.com/Proprium-Labs/docs.git  # token
```

## 5 — Open as vault

Obsidian → **Open folder as vault** → select the `docs` folder.

## 6 — Install Obsidian Git plugin

1. **Settings → Community plugins** → turn on if prompted.
2. **Browse** → search **Git** (by Vinzent03) → **Install** and **Enable**.
3. Token users: paste the token as the password on first sync.
4. Set **Settings → Community plugins → Git**:

| Setting | Value |
| --- | --- |
| Auto commit-and-sync interval (minutes) | `10` |
| Auto pull interval (minutes) | `10` |
| Pull updates on startup | **On** |
| Push on commit-and-sync | **On** |
| Commit message | `vault backup: {{date}}` |

Leave everything else at defaults.

## Everyday use

- Edits sync on the timer. Sync now: `Cmd/Ctrl-P` → **Obsidian Git: Commit-and-sync**.
- Reopening Obsidian pulls the latest changes.
- **Conflict:** delete the `<<<<<<<` / `=======` / `>>>>>>>` lines, keep the correct text, sync again. Unsure? Leave it and ping the owner.
