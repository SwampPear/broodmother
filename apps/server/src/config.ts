import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import type { BroodmotherConfig } from '@broodmother/shared'
import { atomicWrite } from './vault/atomic'

/** `https://token@host` is a credential in a file we sync; `ssh://git@host` is a username. */
export function hasEmbeddedCredentials(url: string): boolean {
  const match = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/([^/?#]*)@/.exec(url)
  if (!match) return false
  return match[1]!.includes(':') || !/^ssh:\/\//i.test(url)
}

const remoteUrl = z
  .string()
  .min(1)
  .refine((url) => !hasEmbeddedCredentials(url), 'remote URL must not embed credentials')
  .nullable()

export const configSchema = z.object({
  vaultPath: z.string().min(1).nullable(),
  profiles: z.record(z.string().min(1), z.string().min(1)),
  worktrees: z.record(z.string().min(1), z.string().min(1)),
  remoteUrl,
  branch: z.string().min(1),
  syncEnabled: z.boolean(),
  syncIdleMs: z.number().int().min(1000),
})

/**
 * Identity is deliberately absent: who you are lives in a profile on disk, and inventing
 * one from the OS user would be a profile nobody chose.
 */
export function defaultConfig(vaultPath: string | null): BroodmotherConfig {
  return {
    vaultPath,
    profiles: {},
    worktrees: {},
    remoteUrl: null,
    branch: 'main',
    syncEnabled: false,
    syncIdleMs: 10_000,
  }
}

export interface LoadedConfig {
  config: BroodmotherConfig
  reset: string[]
}

/**
 * Field-by-field so a malformed file costs only the bad fields — refusing to start would
 * strand the user with no UI to fix the file in.
 */
export function repair(raw: unknown, defaults: BroodmotherConfig): LoadedConfig {
  const source =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  const reset: string[] = source === raw ? [] : Object.keys(configSchema.shape)
  const config = { ...defaults } as Record<string, unknown>

  for (const [key, field] of Object.entries(configSchema.shape)) {
    if (!(key in source)) continue
    const result = field.safeParse(source[key])
    if (result.success) config[key] = result.data
    else if (!reset.includes(key)) reset.push(key)
  }
  return { config: config as unknown as BroodmotherConfig, reset }
}

export class ConfigStore {
  private current: BroodmotherConfig
  private lastReset: string[] = []

  constructor(
    readonly file: string,
    defaults: BroodmotherConfig,
  ) {
    this.current = defaults
  }

  get config(): BroodmotherConfig {
    return this.current
  }

  get reset(): string[] {
    return this.lastReset
  }

  async load(): Promise<LoadedConfig> {
    let raw: unknown
    try {
      raw = JSON.parse(await readFile(this.file, 'utf8'))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.lastReset = []
        return { config: this.current, reset: [] }
      }
      raw = null
    }
    const loaded = repair(raw, this.current)
    this.current = loaded.config
    this.lastReset = loaded.reset
    return loaded
  }

  async save(config: BroodmotherConfig): Promise<BroodmotherConfig> {
    const dir = path.dirname(this.file)
    await mkdir(dir, { recursive: true })
    // App state, not vault content: a self-ignoring directory keeps the sync loop from
    // committing it without touching a .gitignore the user owns.
    await writeFile(path.join(dir, '.gitignore'), '*\n')
    await atomicWrite(this.file, `${JSON.stringify(config, null, 2)}\n`)
    this.current = config
    this.lastReset = []
    return config
  }
}
