import type { Dream } from './core'

/** A ready-made workflow: what the dreams page offers when a vault has none yet, and the
 *  worked examples of what the node kinds are for. */
export interface StarterDream {
  name: string
  description: string
  dream: Dream
}

export function starterDreams(): StarterDream[] {
  return [
    {
      name: 'Morning digest',
      description:
        'Every morning, an agent reads what moved in the vault and writes a short digest of open threads and the day ahead.',
      dream: {
        version: 1,
        nodes: [
          {
            id: 'dawn',
            kind: 'trigger.time',
            name: 'Each morning',
            x: 80,
            y: 120,
            at: '07:30',
          },
          {
            id: 'digest',
            kind: 'agent.claude',
            name: 'Write the digest',
            x: 340,
            y: 120,
            prompt:
              'Look through this vault, especially whatever changed in the last day (`git log --since=yesterday --name-only` helps). Write a short morning digest: open threads, loose ends, and what looks most worth doing today. Under 200 words, plain prose.',
          },
          {
            id: 'log',
            kind: 'agent.note',
            name: 'Keep it',
            x: 600,
            y: 120,
            path: 'Dreams/Digest.md',
            append: true,
          },
        ],
        edges: [
          { from: 'dawn', to: 'digest' },
          { from: 'digest', to: 'log' },
        ],
      },
    },
    {
      name: 'Repo watchdog',
      description:
        'Hourly, a command gathers the repository state, an agent judges it, and only a reply that starts with ALERT gets written down.',
      dream: {
        version: 1,
        nodes: [
          {
            id: 'pulse',
            kind: 'trigger.interval',
            name: 'Hourly',
            x: 80,
            y: 120,
            minutes: 60,
          },
          {
            id: 'state',
            kind: 'agent.shell',
            name: 'Gather state',
            x: 340,
            y: 120,
            command: 'git status --short; git log --oneline -10',
          },
          {
            id: 'judge',
            kind: 'agent.claude',
            name: 'Judge it',
            x: 600,
            y: 120,
            prompt:
              'Here is the current state of this repository. If anything looks concerning — uncommitted work going stale, something half-finished, a surprising change — start your reply with ALERT and say what and why in a sentence or two. Otherwise reply OK.',
          },
          {
            id: 'alerts',
            kind: 'agent.gate',
            name: 'Only alerts',
            x: 860,
            y: 120,
            pattern: '^ALERT',
          },
          {
            id: 'log',
            kind: 'agent.note',
            name: 'Sound it',
            x: 1120,
            y: 120,
            path: 'Dreams/Watchdog.md',
            append: true,
          },
        ],
        edges: [
          { from: 'pulse', to: 'state' },
          { from: 'state', to: 'judge' },
          { from: 'judge', to: 'alerts' },
          { from: 'alerts', to: 'log' },
        ],
      },
    },
    {
      name: 'Inbox triage',
      description:
        'Whenever Inbox.md changes, an agent tidies it — actions, reading, someday — and files a one-line record of what it did.',
      dream: {
        version: 1,
        nodes: [
          {
            id: 'watch',
            kind: 'trigger.file',
            name: 'Inbox moved',
            x: 80,
            y: 120,
            path: 'Inbox.md',
          },
          {
            id: 'triage',
            kind: 'agent.claude',
            name: 'Tidy the inbox',
            x: 340,
            y: 120,
            prompt:
              'The note Inbox.md in this vault just changed. Read it and tidy it in place: group new items under Actions, Reading, and Someday; keep entries terse; drop what is done. Then reply with a one-line summary of what you filed.',
          },
          {
            id: 'log',
            kind: 'agent.note',
            name: 'Record it',
            x: 600,
            y: 120,
            path: 'Dreams/Triage.md',
            append: true,
          },
        ],
        edges: [
          { from: 'watch', to: 'triage' },
          { from: 'triage', to: 'log' },
        ],
      },
    },
  ]
}
