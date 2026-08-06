import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import type { DocRef, DreamRun, DreamStep } from '@/types'

/** Runs a dream has already had are history worth keeping; the ring in memory is not. */
const KEEP = 100

/**
 * The record of every run, one SQLite file in the broodmother home. On disk rather than
 * in memory so the history survives the server — the point of a box in the corner running
 * dreams all day is being able to come back and read what they did.
 */
export class RunStore {
  private readonly db: DatabaseSync

  constructor(file: string) {
    mkdirSync(path.dirname(file), { recursive: true })
    this.db = new DatabaseSync(file)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vault TEXT NOT NULL DEFAULT '',
        root TEXT NOT NULL,
        path TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        finished_at INTEGER,
        state TEXT NOT NULL,
        error TEXT,
        steps TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS runs_by_dream ON runs (root, path, id);
    `)
    // A file from before runs named their vault: the column arrives empty and `adopt`
    // fills it in with the vault those runs were about.
    const columns = this.db.prepare(`PRAGMA table_info(runs)`).all() as { name: string }[]
    if (!columns.some((column) => column.name === 'vault'))
      this.db.exec(`ALTER TABLE runs ADD COLUMN vault TEXT NOT NULL DEFAULT ''`)
  }

  /** Files history from the one-vault days under the vault it was always about. */
  adopt(vault: string): void {
    this.db.prepare(`UPDATE runs SET vault = ? WHERE vault = ''`).run(vault)
  }

  /** Files the run: the id it will be saved under from here on, and the ids the trim
   *  let go — so whatever those runs left on disk can go with them. */
  add(run: Omit<DreamRun, 'id'>, vault = ''): { id: string; pruned: string[] } {
    const inserted = this.db
      .prepare(
        `INSERT INTO runs (vault, root, path, started_at, finished_at, state, error, steps)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        vault,
        run.ref.root,
        run.ref.path,
        run.startedAt,
        run.finishedAt ?? null,
        run.state,
        run.error ?? null,
        JSON.stringify(run.steps),
      )
    const beyond = `SELECT id FROM runs WHERE vault = ? AND root = ? AND path = ? AND id NOT IN
       (SELECT id FROM runs WHERE vault = ? AND root = ? AND path = ? ORDER BY id DESC LIMIT ?)`
    const keys = [
      vault,
      run.ref.root,
      run.ref.path,
      vault,
      run.ref.root,
      run.ref.path,
      KEEP,
    ]
    const pruned = this.db
      .prepare(beyond)
      .all(...keys)
      .map((row) => `run-${String((row as { id: number }).id)}`)
    this.db.prepare(`DELETE FROM runs WHERE id IN (${beyond})`).run(...keys)
    return { id: `run-${String(inserted.lastInsertRowid)}`, pruned }
  }

  /** The whole run again, steps and all — a run mid-walk is saved as often as it moves. */
  save(run: DreamRun): void {
    this.db
      .prepare(
        `UPDATE runs SET finished_at = ?, state = ?, error = ?, steps = ? WHERE id = ?`,
      )
      .run(
        run.finishedAt ?? null,
        run.state,
        run.error ?? null,
        JSON.stringify(run.steps),
        rowIdOf(run.id),
      )
  }

  /** One dream's runs, newest first. Null vault reads across every vault, which is the
   *  one-vault world's question asked the old way. */
  runsFor(ref: DocRef, limit = 20, vault: string | null = null): DreamRun[] {
    return vault === null
      ? this.db
          .prepare(
            `SELECT * FROM runs WHERE root = ? AND path = ? ORDER BY id DESC LIMIT ?`,
          )
          .all(ref.root, ref.path, limit)
          .map(toRun)
      : this.db
          .prepare(
            `SELECT * FROM runs WHERE vault = ? AND root = ? AND path = ? ORDER BY id DESC LIMIT ?`,
          )
          .all(vault, ref.root, ref.path, limit)
          .map(toRun)
  }

  /** Every dream's runs together, newest first — the page's log. */
  recent(limit = 50, vault: string | null = null): DreamRun[] {
    return vault === null
      ? this.db
          .prepare(`SELECT * FROM runs ORDER BY id DESC LIMIT ?`)
          .all(limit)
          .map(toRun)
      : this.db
          .prepare(`SELECT * FROM runs WHERE vault = ? ORDER BY id DESC LIMIT ?`)
          .all(vault, limit)
          .map(toRun)
  }

  close(): void {
    this.db.close()
  }
}

function rowIdOf(id: string): number {
  return Number(id.replace('run-', ''))
}

function toRun(row: Record<string, unknown>): DreamRun {
  const run: DreamRun = {
    id: `run-${String(row.id as number)}`,
    ref: { root: row.root as DreamRun['ref']['root'], path: row.path as string },
    startedAt: row.started_at as number,
    state: row.state as DreamRun['state'],
    steps: JSON.parse(row.steps as string) as DreamStep[],
  }
  if (row.finished_at !== null) run.finishedAt = row.finished_at as number
  if (row.error !== null) run.error = row.error as string
  return run
}
