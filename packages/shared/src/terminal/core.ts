export type TerminalClientMessage =
  { type: 'input'; data: string } | { type: 'resize'; cols: number; rows: number }

export type TerminalServerMessage =
  { type: 'output'; data: string } | { type: 'exit'; code: number }
