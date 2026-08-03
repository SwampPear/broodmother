import {
  DreamError,
  basename,
  isTrigger,
  parseDream,
  runOrder,
  triggerLabel,
  type ClaudeNode,
  type DocRef,
  type DocRoot,
  type Dream,
  type DreamRun,
  type DreamStep,
  type DreamSummary,
  type TreeEntry,
} from '@broodmother/shared'
import { writeFile } from 'node:fs/promises'
import type { Tree } from '../tree'
import { performStep, type StepCtx, type StepResult } from './blocks'
import { scheduleLines, type Crontab } from './crontab'
import type { RunStore } from './db'
import {
  composeInput,
  openScratch,
  openingContext,
  pruneScratch,
  runScratch,
  stepFiles,
  type StepFiles,
} from './scratch'
import type { TriggerStore } from './state'
import { eventCheck } from './triggers'

/** One place a dream can live: an open checkout, with the tree that reads it. */
export interface DreamSite {
  root: DocRoot
  tree: Tree
  path: string
}

export interface DreamsDeps {
  sites(): DreamSite[]
  /** Where `agent.note` writes: notes are a vault idea, wherever the dream lives. */
  vault(): Tree | null
  /** Where the cron lines point: the server's own address, empty until it listens. */
  url(): string
  /** The system crontab, holding one line per scheduled trigger. */
  cron: Crontab
  /** The cursors event triggers save between checks. */
  store: TriggerStore
  /** The record every run lands in, and where the page reads them back from. */
  runs: RunStore
  /** Where each run's folder of hand-off files opens — under the broodmother home. */
  scratch(): string
  /** Extra environment for the agent, the profile's say — CLAUDE_CONFIG_DIR and kin. */
  env?(): Record<string, string>
  /** The system-prompt body a persona name resolves to — a vault idea, like notes. */
  persona?(name: string): Promise<string | null>
  agent?(node: ClaudeNode, ctx: StepCtx): Promise<StepResult | string>
  fetch?: typeof fetch
  now?(): number
}

const TICK_MS = 30_000

function refKey(ref: DocRef): string {
  return `${ref.root}:${ref.path}`
}

interface FoundDream {
  site: DreamSite
  ref: DocRef
  dream: Dream
}

/**
 * The orchestrator: on every beat it finds the dreams in every open checkout, keeps the
 * system crontab holding one line per scheduled trigger — cron fires the run back in
 * through the run route — and checks each event trigger against its saved cursor, firing
 * the dream when the source moved. Runs live in memory — a short ring per dream — because
 * a run is news, not a record; the notes a dream writes are its record.
 */
export class Dreams {
  /** The runs mid-walk, one per dream at most; finished ones live in the store alone. */
  private readonly walking = new Map<string, DreamRun>()
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(private readonly deps: DreamsDeps) {}

  private now(): number {
    return this.deps.now?.() ?? Date.now()
  }

  start(intervalMs = TICK_MS): void {
    if (this.timer) return
    this.timer = setInterval(() => void this.tick(), intervalMs)
    this.timer.unref?.()
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  runsFor(ref: DocRef): DreamRun[] {
    return this.deps.runs.runsFor(ref).map((run) => this.placed(run))
  }

  log(limit = 50): DreamRun[] {
    return this.deps.runs.recent(limit).map((run) => this.placed(run))
  }

  /** Where the run's files are is derived, not stored: the base and the id say it all. */
  private placed(run: DreamRun): DreamRun {
    return { ...run, scratch: runScratch(this.deps.scratch(), run.id) }
  }

  private live(ref: DocRef): DreamRun | null {
    return this.walking.get(refKey(ref)) ?? null
  }

  /** One beat: find every dream, hold the crontab to the schedules, check the events. */
  async tick(): Promise<void> {
    const found = await this.found()
    await this.schedule(found)
    await this.watch(found)
  }

  private async found(): Promise<FoundDream[]> {
    const found: FoundDream[] = []
    for (const site of this.deps.sites()) {
      const paths = await dreamFiles(site.tree).catch(() => [])
      for (const path of paths) {
        const dream = await this.read(site, path).catch(() => null)
        if (dream) found.push({ site, ref: { root: site.root, path }, dream })
      }
    }
    return found
  }

  /** The page's table: every dream, the wired triggers that will fire it, its last run. */
  async summaries(): Promise<DreamSummary[]> {
    return (await this.found()).map(({ ref, dream }) => {
      const wired = new Set(dream.edges.map((edge) => edge.from))
      return {
        ref,
        name: basename(ref.path).replace(/\.dream$/, ''),
        triggers: dream.nodes.flatMap((node) => {
          const label = triggerLabel(node)
          return label && wired.has(node.id) ? [{ kind: node.kind, label }] : []
        }),
        lastRun: this.deps.runs.runsFor(ref, 1)[0] ?? null,
      }
    })
  }

  /** The crontab mirrors the wired schedule triggers; cron does the waking from there. */
  private async schedule(found: FoundDream[]): Promise<void> {
    const url = this.deps.url()
    if (!url) return
    await this.deps.cron.sync(scheduleLines(found, url)).catch(() => null)
  }

  private async watch(found: FoundDream[]): Promise<void> {
    const alive = new Set<string>()
    for (const { site, ref, dream } of found) {
      const wired = new Set(dream.edges.map((edge) => edge.from))
      for (const node of dream.nodes) {
        const check = eventCheck(node)
        if (!check || !wired.has(node.id)) continue
        const key = `${refKey(ref)}#${node.id}`
        alive.add(key)
        const tools = { cwd: site.path, fetch: this.deps.fetch ?? fetch }
        // A source that cannot be read keeps its cursor and gets asked again next beat.
        const seen = await check(await this.deps.store.get(key), tools).catch(() => null)
        if (!seen) continue
        await this.deps.store.set(key, seen.state)
        const firing = seen.firings[0]
        if (firing && !this.live(ref))
          await this.start_(site, ref, dream, { [node.id]: firing.payload }).catch(
            () => null,
          )
      }
    }
    await this.deps.store.prune(alive).catch(() => null)
  }

  private async read(site: DreamSite, path: string): Promise<Dream> {
    return parseDream(await site.tree.read(path))
  }

  /**
   * Starts a run and hands it back mid-flight; the steps fill in as the graph walks. A
   * dream already running joins that run instead of stacking a second — the Run button
   * and a cron beat landing mid-run both mean "be running", not "run twice".
   */
  async run(ref: DocRef): Promise<DreamRun> {
    const running = this.live(ref)
    if (running) return running
    const site = this.deps.sites().find((one) => one.root === ref.root)
    if (!site) throw new DreamError(`no open root ${ref.root}`)
    return this.start_(site, ref, await this.read(site, ref.path))
  }

  private async start_(
    site: DreamSite,
    ref: DocRef,
    dream: Dream,
    seed?: Record<string, string>,
  ): Promise<DreamRun> {
    const order = runOrder(dream)
    if (!order) throw new DreamError('the dream has a cycle — untangle it first')
    const byId = new Map(dream.nodes.map((node) => [node.id, node]))
    const opened: Omit<DreamRun, 'id'> = {
      ref,
      startedAt: this.now(),
      state: 'running',
      steps: order.flat().flatMap((id): DreamStep[] => {
        const node = byId.get(id)
        return node
          ? [{ node: id, name: node.name, kind: node.kind, state: 'waiting' }]
          : []
      }),
    }
    const filed = this.deps.runs.add(opened)
    const run: DreamRun = this.placed({ id: filed.id, ...opened })
    // The rows the store let go take their folders with them.
    void pruneScratch(this.deps.scratch(), filed.pruned).catch(() => null)
    this.walking.set(refKey(ref), run)
    void this.walk(site, dream, run, seed)
      .catch(() => null)
      .finally(() => this.walking.delete(refKey(ref)))
    return run
  }

  private async walk(
    site: DreamSite,
    dream: Dream,
    run: DreamRun,
    seed?: Record<string, string>,
  ): Promise<void> {
    const steps = new Map(run.steps.map((step) => [step.node, step]))
    const byId = new Map(dream.nodes.map((node) => [node.id, node]))
    const scratch = await openScratch(this.deps.scratch(), run.id).catch(() => null)
    /** Edges a gate held, a verdict passed over or a stop ended: what is fed only
     *  through them never runs. */
    const pruned = new Set<string>()
    const wire = (edge: Dream['edges'][number]) => `${edge.from}>${edge.to}`
    const cut = (from: string, keep?: Set<string>) => {
      for (const edge of dream.edges)
        if (edge.from === from && !keep?.has(edge.to)) pruned.add(wire(edge))
    }
    for (const step of run.steps) {
      if (run.state === 'error') {
        step.state = 'skipped'
        continue
      }
      const node = byId.get(step.node)
      if (!node) continue
      const files = scratch ? stepFiles(scratch, node.id) : null
      if (isTrigger(node)) {
        // What the trigger saw opens the run — an empty word for a manual one.
        step.output = await openingContext(node, seed?.[node.id]).catch(
          () => seed?.[node.id] ?? '',
        )
        step.state = 'done'
        if (files) await writeFile(files.opening, step.output).catch(() => null)
        continue
      }
      const feeds = dream.edges.filter((edge) => edge.to === node.id)
      const live = feeds.filter((edge) => !pruned.has(wire(edge)))
      if (feeds.length > 0 && live.length === 0) {
        cut(node.id)
        step.state = 'skipped'
        this.deps.runs.save(run)
        continue
      }
      const input = composeInput(
        live.map((edge) => ({
          name: byId.get(edge.from)?.name ?? edge.from,
          output: steps.get(edge.from)?.output ?? '',
        })),
      )
      if (files) await writeFile(files.input, input).catch(() => null)
      step.state = 'running'
      this.deps.runs.save(run)
      const routes = dream.edges
        .filter((edge) => edge.from === node.id)
        .map((edge) => byId.get(edge.to)?.name ?? edge.to)
      try {
        const result = await this.perform(site, node, input, files, routes)
        step.output = result.output
        if (files) await writeFile(files.output, result.output).catch(() => null)
        if (result.stop !== undefined) {
          // A deliberate halt is an outcome, not a failure: the run still finishes.
          step.state = 'stopped'
          step.halted = result.stop
          cut(node.id)
        } else {
          step.state = 'done'
          if (result.next) cut(node.id, this.chosen(dream, byId, node.id, result.next))
        }
      } catch (error) {
        step.state = 'error'
        step.error = error instanceof Error ? error.message : String(error)
        run.state = 'error'
        run.error = `${node.name}: ${step.error}`
      }
    }
    if (run.state === 'running') run.state = 'done'
    run.finishedAt = this.now()
    this.deps.runs.save(run)
  }

  /** The nodes a verdict picked, by name or id — a name no path answers to is an error,
   *  because a decision that silently went nowhere would read as one that was obeyed. */
  private chosen(
    dream: Dream,
    byId: Map<string, Dream['nodes'][number]>,
    from: string,
    next: string[],
  ): Set<string> {
    const onward = dream.edges.filter((edge) => edge.from === from)
    const keep = new Set<string>()
    for (const choice of next) {
      const hits = onward.filter(
        (edge) => edge.to === choice || byId.get(edge.to)?.name === choice,
      )
      if (hits.length === 0) throw new DreamError(`no path onward named "${choice}"`)
      for (const hit of hits) keep.add(hit.to)
    }
    return keep
  }

  private async perform(
    site: DreamSite,
    node: Dream['nodes'][number],
    input: string,
    files: StepFiles | null,
    routes: string[],
  ): Promise<StepResult> {
    const ctx: StepCtx = {
      cwd: site.path,
      vault: this.deps.vault(),
      input,
      inputPath: files?.input ?? '',
      outputPath: files?.output ?? '',
      verdictPath: files?.verdict ?? '',
      routes,
      env: this.deps.env?.() ?? {},
      persona: null,
    }
    if (node.kind === 'agent.claude') {
      ctx.persona = node.persona
        ? ((await this.deps.persona?.(node.persona)) ?? null)
        : null
      if (node.persona && ctx.persona === null)
        throw new DreamError(`no persona named "${node.persona}"`)
      if (this.deps.agent) {
        const said = await this.deps.agent(node, ctx)
        return typeof said === 'string' ? { output: said } : said
      }
    }
    return (await performStep(node, ctx)) ?? { output: '' }
  }
}

async function dreamFiles(tree: Tree): Promise<string[]> {
  const found: string[] = []
  const collect = (entries: TreeEntry[]) => {
    for (const entry of entries) {
      if (entry.kind === 'dir') collect(entry.children)
      else if (entry.path.endsWith('.dream')) found.push(entry.path)
    }
  }
  collect(await tree.list())
  return found
}
