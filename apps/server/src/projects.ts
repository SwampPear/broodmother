import { mkdir, readFile, readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import type { Project } from '@mother/shared'
import { PROFILES_DIR, motherHome } from './profiles'
import { atomicWrite } from './vault/atomic'
import { nameProblem } from './vault/paths'

export class ProjectError extends Error {}

const settingsFile = (dir: string) => path.join(dir, 'project.json')

const settingsSchema = z.object({ profile: z.string().min(1).nullable() })

export function assertProjectName(name: string): void {
  const problem = nameProblem(name)
  if (problem) throw new ProjectError(`project name ${problem}`)
  if (name === PROFILES_DIR)
    throw new ProjectError(
      `"${PROFILES_DIR}" holds the profiles, so it cannot be a project`,
    )
}

/**
 * A folder dropped in by hand is a project too, so a missing or malformed `project.json`
 * means only that no profile has been picked for it yet — never that the folder is not one.
 */
async function profileOf(dir: string): Promise<string | null> {
  const raw = await readFile(settingsFile(dir), 'utf8')
    .then(JSON.parse)
    .catch(() => null)
  const result = settingsSchema.safeParse(raw)
  return result.success ? result.data.profile : null
}

/** Every plain directory in the home is a project, bar the one the profiles live in. */
export async function listProjects(home = motherHome()): Promise<Project[]> {
  await mkdir(home, { recursive: true })
  const entries = await readdir(home, { withFileTypes: true })
  const projects = await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isDirectory() &&
          !entry.name.startsWith('.') &&
          entry.name !== PROFILES_DIR,
      )
      .map(async (entry) => {
        const dir = path.join(home, entry.name)
        return { name: entry.name, path: dir, profile: await profileOf(dir) }
      }),
  )
  return projects.sort((a, b) => a.name.localeCompare(b.name))
}

export async function findProject(
  name: string,
  home = motherHome(),
): Promise<Project | null> {
  const projects = await listProjects(home)
  return projects.find((project) => project.name === name) ?? null
}

export async function setProjectProfile(
  project: Project,
  profile: string | null,
): Promise<Project> {
  await atomicWrite(
    settingsFile(project.path),
    `${JSON.stringify({ profile }, null, 2)}\n`,
  )
  return { ...project, profile }
}

export async function createProject(
  name: string,
  profile: string | null,
  home = motherHome(),
): Promise<Project> {
  assertProjectName(name)
  await mkdir(home, { recursive: true })

  const target = path.join(home, name)
  const taken = await readdir(home).then((names) => names.includes(name))
  if (taken) throw new ProjectError(`a project named "${name}" already exists`)

  await mkdir(target)
  return setProjectProfile({ name, path: target, profile }, profile)
}

/**
 * The folder and everything in it, vaults included. The path comes from the listing rather
 * than from the name, so what is removed is always a folder in the home and never whatever
 * a `../` in the name would have reached.
 */
export async function deleteProject(name: string, home = motherHome()): Promise<void> {
  const project = await findProject(name, home)
  if (!project) throw new ProjectError(`no project named "${name}"`)
  await rm(project.path, { recursive: true, force: true })
}
