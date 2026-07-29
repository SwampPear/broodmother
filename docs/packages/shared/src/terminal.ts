/**
 * The terminal socket: one shell per connection, JSON both ways. Nothing about a shell
 * outlives its socket — closing the tab kills the process group with it.
 */
export type TerminalClientMessage =
  { type: 'input'; data: string } | { type: 'resize'; cols: number; rows: number }

export type TerminalServerMessage =
  { type: 'output'; data: string } | { type: 'exit'; code: number }
