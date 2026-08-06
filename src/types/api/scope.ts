import type { BroodmotherConfig } from '../core'
import type { DocRoot } from '../tree'

// Where you are working: the vault, or one of its projects. Every project is open at once,
// so this settles nothing about what is loaded — it is what the tabs, the branches and a
// new shell are all about, and it is remembered so a relaunch stands where you left off.
export interface PostScope {
  request: { root: DocRoot }
  response: { config: BroodmotherConfig }
}
