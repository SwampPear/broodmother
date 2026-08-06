export type DreamKind = DreamNode['kind']

interface NodeBase {
  id: string
  name: string
  x: number
  y: number
}

export interface ManualTrigger extends NodeBase {
  kind: 'trigger.manual'
}

export interface IntervalTrigger extends NodeBase {
  kind: 'trigger.interval'
  minutes: number
}

export interface TimeTrigger extends NodeBase {
  kind: 'trigger.time'
  at: string // local time of day, HH:MM
}

export interface FileTrigger extends NodeBase {
  kind: 'trigger.file'
  path: string // the file watched, absolute or relative to the checkout the dream lives in
}

export interface HttpTrigger extends NodeBase {
  kind: 'trigger.http'
  url: string // polled on the watcher's beat; a changed answer fires the dream
}

export interface ClaudeNode extends NodeBase {
  kind: 'agent.claude'
  prompt: string
  persona?: string // vault persona whose PERSONA.md joins the agent's system prompt
  minutes?: number // how long the errand may take. Unset is 5 — a step, not a day
}

export interface ShellNode extends NodeBase {
  kind: 'agent.shell'
  command: string // run by `sh -c` in the checkout, upstream output on stdin, stdout onward
  minutes?: number
}

// The branch continues only when the input matches the pattern — how "act on what the agent
// flagged" is written: the agent starts its answer with a word, the gate looks for it, and a
// quiet answer ends the branch without ending the run.
export interface GateNode extends NodeBase {
  kind: 'agent.gate'
  pattern: string
}

export interface NoteNode extends NodeBase {
  kind: 'agent.note'
  path: string // vault path of the note the run's output lands in
  append?: boolean // add to the end instead of rewriting — how a recurring dream keeps a log
}

export type DreamNode =
  | ManualTrigger
  | IntervalTrigger
  | TimeTrigger
  | FileTrigger
  | HttpTrigger
  | ClaudeNode
  | ShellNode
  | GateNode
  | NoteNode

export interface DreamEdge {
  from: string
  to: string
}

export interface Dream {
  version: 1
  nodes: DreamNode[]
  edges: DreamEdge[]
}

// A ready-made workflow: what the dreams page offers when a vault has none yet, and the
// worked examples of what the node kinds are for.
export interface StarterDream {
  name: string
  description: string
  dream: Dream
}
