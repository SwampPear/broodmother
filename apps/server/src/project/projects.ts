import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import type { NewProject, Profile, ProjectSummary } from '@broodmother/shared'
import type { Checkouts } from '../branches'
import { atomicWrite, nameProblem } from '../fs'
import { readAccount } from '../profiles'
import { Git, classifyRemoteError } from '../git'

export class ProjectError extends Error {}

/**
 * Where a vault keeps what it knows about its projects: which repositories they are, and
 * the checkouts broodmother made for their branches. It sits beside the vault's checkouts
 * rather than inside one, so the sync loop never sees it and no branch carries a different
 * list of projects than its neighbour.
 */
export const PROJECTS_DIR = '.projects'

const REGISTRY = 'projects.json'

const registryFile = (vault: string) => path.join(vault, PROJECTS_DIR, REGISTRY)

/** A project's checkouts: your repository, and the worktrees the vault holds for it. */
export const projectCheckouts = (vault: string, project: ProjectSummary): Checkouts => ({
  primary: project.repo,
  worktrees: path.join(vault, PROJECTS_DIR, project.name),
})

const registrySchema = z.record(z.string().min(1), z.string().min(1))

const isDir = (target: string) =>
  stat(target).then(
    (info) => info.isDirectory(),
    () => false,
  )

/** Name to repository. A file that will not parse is a vault with no projects yet, which
 *  is what a vault starts as — refusing to open it would be worse. */
async function readRegistry(vault: string): Promise<Record<string, string>> {
  const raw = await readFile(registryFile(vault), 'utf8')
    .then(JSON.parse)
    .catch(() => null)
  const parsed = registrySchema.safeParse(raw)
  return parsed.success ? parsed.data : {}
}

async function writeRegistry(
  vault: string,
  entries: Record<string, string>,
): Promise<void> {
  await mkdir(path.join(vault, PROJECTS_DIR), { recursive: true })
  await atomicWrite(registryFile(vault), `${JSON.stringify(entries, null, 2)}\n`)
}

/** Every project the vault links, each asked whether its folder is still there. */
export async function listProjects(vault: string): Promise<ProjectSummary[]> {
  const entries = await readRegistry(vault)
  const projects = await Promise.all(
    Object.entries(entries).map(async ([name, repo]) => ({
      name,
      repo,
      missing: !(await isDir(repo)),
    })),
  )
  return projects.sort((a, b) => a.name.localeCompare(b.name))
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
 * The folder a project is, made the way a vault's is: a plain directory, a repository of its
 * own, or a clone of a remote proven reachable before anything is written. The repository is
 * the folder itself rather than a checkout inside it, because a project was a repository
 * somewhere on your disk long before broodmother had a name for it.
 */
async function makeRepo(
  target: string,
  { git: kind = 'none', remoteUrl, branch }: NewProject,
  profile: Profile,
): Promise<void> {
  const name = path.basename(target)
  const head = branch?.trim() || DEFAULT_BRANCH
  const url = remoteUrl?.trim() ?? ''
  const token = (await readAccount(profile))?.token ?? null

  if (kind === 'remote') {
    if (!url) throw new ProjectError('a project cloned from a remote needs one')
    const outer = new Git(path.dirname(target), profile.sshKeyPath, token)
    const probe = await outer.run(['ls-remote', '--heads', url, head], 15_000)
    if (probe.exitCode !== 0) {
      const message = `${probe.stdout}\n${probe.stderr}`
      throw new ProjectError(
        `${classifyRemoteError(message)}: ${String(probe.stderr).trim() || 'remote unreachable'}`,
      )
    }

    if (String(probe.stdout).trim()) {
      const clone = await outer.run(['clone', '--branch', head, url, target])
      if (clone.exitCode !== 0) {
        await rm(target, { recursive: true, force: true })
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
 * Links a repository to a vault, making the folder first when there is none there yet. Git
 * is not required — a folder of code with no history is an ordinary thing to work in, and
 * the branch menu simply has nothing to offer. A folder that already exists is linked as it
 * stands: it was yours before this, and nothing is written into it.
 */
export async function registerProject(
  vault: string,
  input: NewProject,
  profile: Profile | null = null,
): Promise<ProjectSummary> {
  const { name, repo } = input
  const problem = nameProblem(name)
  if (problem) throw new ProjectError(`project name ${problem}`)

  const entries = await readRegistry(vault)
  if (entries[name]) throw new ProjectError(`a project named "${name}" already exists`)

  const target = path.resolve(repo)
  if (!(await isDir(target))) {
    if (!profile) throw new ProjectError(`no folder at "${target}"`)
    await makeRepo(target, input, profile)
  }

  await writeRegistry(vault, { ...entries, [name]: target })
  return { name, repo: target, missing: false }
}

/**
 * Unlinks a project: the entry goes, and so do the checkouts broodmother made for its
 * branches. The repository itself is left exactly where it is — it was never ours to
 * remove — and the branches inside it are untouched.
 */
export async function forgetProject(vault: string, name: string): Promise<void> {
  const entries = await readRegistry(vault)
  const repo = entries[name]
  if (!repo) throw new ProjectError(`no project named "${name}"`)

  await rm(path.join(vault, PROJECTS_DIR, name), { recursive: true, force: true })
  // git's record of a worktree outlives the folder, so it is dropped after them. A
  // repository that has moved or lost its `.git` has nothing to prune and says so; that is
  // not a reason to refuse the unlink.
  await new Git(repo).run(['worktree', 'prune'])

  const { [name]: _gone, ...rest } = entries
  await writeRegistry(vault, rest)
}
