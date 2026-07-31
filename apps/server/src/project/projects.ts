import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { NewProject, Profile, ProjectSummary } from '@broodmother/shared'
import type { Checkouts } from '../branches'
import { nameProblem } from '../fs'
import { readAccount } from '../profiles'
import { Git, classifyRemoteError } from '../git'
import { PRIMARY, checkoutPath } from '../vault'

export class ProjectError extends Error {}

/**
 * Where a vault keeps its projects. It sits beside the vault's own checkouts rather than
 * inside one, so the sync loop never sees it and no branch of the vault carries a different
 * set of projects than its neighbour.
 */
export const PROJECTS_DIR = '.projects'

export const projectPath = (vault: string, name: string) =>
  path.join(vault, PROJECTS_DIR, name)

/** A project is a folder of checkouts, shaped exactly like the vault holding it. */
export const projectCheckouts = (vault: string, name: string): Checkouts => ({
  primary: checkoutPath(projectPath(vault, name), PRIMARY),
  worktrees: projectPath(vault, name),
})

/** Every project in the vault — drop a folder in and it is picked up, the way a vault is. */
export async function listProjects(vault: string): Promise<ProjectSummary[]> {
  const dir = path.join(vault, PROJECTS_DIR)
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => ({
      name: entry.name,
      repo: projectCheckouts(vault, entry.name).primary,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function findProject(
  vault: string,
  name: string,
): Promise<ProjectSummary | null> {
  const projects = await listProjects(vault)
  return projects.find((project) => project.name === name) ?? null
}

const DEFAULT_BRANCH = 'main'

const readme = (name: string) => `# ${name}\n`

/**
 * The repository a project is, made the way a vault's is: a plain directory, a repository of
 * its own, or a clone of a remote proven reachable before anything is written. It is the
 * project's `local`, so the checkouts its branches get are its peers.
 */
async function makeRepo(
  target: string,
  { git: kind = 'none', remoteUrl, branch }: NewProject,
  profile: Profile,
): Promise<void> {
  const name = path.basename(path.dirname(target))
  const head = branch?.trim() || DEFAULT_BRANCH
  const url = remoteUrl?.trim() ?? ''
  const token = (await readAccount(profile))?.token ?? null

  if (kind === 'remote') {
    if (!url) throw new ProjectError('a project cloned from a remote needs one')
    // Both the probe and the clone run in the folder the checkout will sit in, and git
    // cannot start in a directory that is not there.
    await mkdir(path.dirname(target), { recursive: true })
    const outer = new Git(path.dirname(target), profile.sshKeyPath, token)
    const probe = await outer.run(['ls-remote', '--heads', url, head], 15_000)
    if (probe.exitCode !== 0) {
      const message = `${probe.stdout}\n${probe.stderr}`
      throw new ProjectError(
        `${classifyRemoteError(message)}: ${String(probe.stderr).trim() || 'remote unreachable'}`,
      )
    }

    if (String(probe.stdout).trim()) {
      const clone = await outer.run(['clone', '--branch', head, url, PRIMARY])
      if (clone.exitCode !== 0) {
        await rm(path.dirname(target), { recursive: true, force: true })
        throw new ProjectError(String(clone.stderr).trim() || 'git clone failed')
      }
      return
    }
  }

  await mkdir(target, { recursive: true })
  if (kind === 'none') return

  // A branch of a project is a worktree of it, and git will not make one of a repository
  // with no commits — so a repository broodmother makes starts with one.
  const git = new Git(target, profile.sshKeyPath, token)
  await git.run(['init', '-b', head])
  if (kind === 'remote') await git.run(['remote', 'add', 'origin', url])
  await writeFile(path.join(target, 'README.md'), readme(name))
  await git.stageAll()
  const commit = await git.commit(
    `broodmother: create project ${name}`,
    profile.gitAuthor,
  )
  if (!commit.ok) throw new ProjectError(commit.message)
}

/**
 * Makes a project inside the vault. Git is not required — a folder of code with no history
 * is an ordinary thing to work in, and the branch menu simply has nothing to offer.
 */
export async function createProject(
  vault: string,
  input: NewProject,
  profile: Profile,
): Promise<ProjectSummary> {
  const { name } = input
  const problem = nameProblem(name)
  if (problem) throw new ProjectError(`project name ${problem}`)
  if (await findProject(vault, name))
    throw new ProjectError(`a project named "${name}" already exists`)

  const checkouts = projectCheckouts(vault, name)
  await makeRepo(checkouts.primary, input, profile)
  return { name, repo: checkouts.primary }
}

/** The project's folder and everything in it: the repository, and the checkouts its
 *  branches were given. It lived in the vault, so this is the last copy. */
export async function deleteProject(vault: string, name: string): Promise<void> {
  const project = await findProject(vault, name)
  if (!project) throw new ProjectError(`no project named "${name}"`)
  await rm(projectPath(vault, name), { recursive: true, force: true })
}
