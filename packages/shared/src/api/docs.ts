import type { VaultPath } from '../vault'

export interface Backlink {
  from: VaultPath // the document that links
  to: VaultPath   // the document linked to
  context: string // the sentence the link sits in
}

export interface MoveResult {
  to: VaultPath          // where it landed
  linksRewritten: number // documents whose links were fixed; the rename dialog reports it
}

export interface GetDoc {
  request: { path: VaultPath }
  response: { markdown: string }
}

export interface PutDoc {
  request: { path: VaultPath; markdown: string }
  response: { ok: true }
}

export interface PostDocMove {
  request: { from: VaultPath; to: VaultPath }
  response: MoveResult
}

export interface DeleteDoc {
  request: { path: VaultPath }
  response: { ok: true }
}

export interface GetLinks {
  request: { path: VaultPath }
  response: { backlinks: Backlink[]; outbound: Backlink[] }
}
