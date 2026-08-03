import { utimes, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, expect, it } from 'vitest'
import type { DreamNode } from '@broodmother/shared'
import { cleanup, tempDir } from '../test'
import { TriggerStore } from './state'
import { eventCheck, type TriggerTools } from './triggers'

afterAll(cleanup)

function node(kind: DreamNode['kind'], config: object = {}): DreamNode {
  return { id: 'watch', kind, name: 'watch', x: 0, y: 0, ...config } as DreamNode
}

function webAnswering(body: string, etag?: string) {
  return (async () =>
    new Response(body, {
      headers: etag ? { etag } : {},
    })) as unknown as typeof fetch
}

const offline = (async () =>
  new Response('gone', { status: 500 })) as unknown as typeof fetch

function tools(cwd: string, web: typeof fetch = offline): TriggerTools {
  return { cwd, fetch: web }
}

it('has no check for the triggers that are not events', () => {
  expect(eventCheck(node('trigger.manual'))).toBeNull()
  expect(eventCheck(node('trigger.interval', { minutes: 5 }))).toBeNull()
  expect(eventCheck(node('trigger.time', { at: '09:00' }))).toBeNull()
})

it('fires the file trigger on a change after its baseline, and on appearing', async () => {
  const dir = await tempDir()
  const target = path.join(dir, 'in.md')
  const check = eventCheck(node('trigger.file', { path: 'in.md' }))!

  const baseline = await check(null, tools(dir))
  expect(baseline.firings).toEqual([])

  let seen = await check(baseline.state, tools(dir))
  expect(seen.firings).toEqual([])

  await writeFile(target, 'hello')
  seen = await check(seen.state, tools(dir))
  expect(seen.firings).toEqual([{ payload: target }])

  await utimes(target, new Date(), new Date(Date.now() + 5000))
  seen = await check(seen.state, tools(dir))
  expect(seen.firings).toEqual([{ payload: target }])
})

it('fires the http trigger when the answer changes, trusting an etag first', async () => {
  const check = eventCheck(node('trigger.http', { url: 'https://x' }))!
  const baseline = await check(null, tools('/', webAnswering('news', 'v1')))
  expect(baseline.firings).toEqual([])

  const same = await check(baseline.state, tools('/', webAnswering('news', 'v1')))
  expect(same.firings).toEqual([])

  const changed = await check(same.state, tools('/', webAnswering('newer news', 'v2')))
  expect(changed.firings).toEqual([{ payload: 'newer news' }])

  // Without an etag the body itself is the mark.
  const bare = await check(null, tools('/', webAnswering('a')))
  const moved = await check(bare.state, tools('/', webAnswering('b')))
  expect(moved.firings).toEqual([{ payload: 'b' }])
})

it('throws on an answer that is not ok, leaving the state for next time', async () => {
  const check = eventCheck(node('trigger.http', { url: 'https://x' }))!
  await expect(check(null, tools('/', offline))).rejects.toThrow('answered 500')
})

it('remembers cursors across stores and prunes the dead ones', async () => {
  const file = path.join(await tempDir(), 'triggers.json')
  const store = new TriggerStore(file)
  expect(await store.get('vault:A.dream#watch')).toBeNull()
  await store.set('vault:A.dream#watch', { mtime: 7 })
  await store.set('vault:B.dream#poll', { mark: 'v1' })

  const reopened = new TriggerStore(file)
  expect(await reopened.get('vault:A.dream#watch')).toEqual({ mtime: 7 })

  await reopened.prune(new Set(['vault:B.dream#poll']))
  const pruned = new TriggerStore(file)
  expect(await pruned.get('vault:A.dream#watch')).toBeNull()
  expect(await pruned.get('vault:B.dream#poll')).toEqual({ mark: 'v1' })
})
