// Finished with a shell — the one thing that ends one early, said as a request of its own
// because a socket closing no longer means it. The name is the pane's, and everything a
// split opened under it goes at the same time: a tab is closed whole.
export interface DeleteTerminal {
  request: { session: string }
  response: { closed: number }
}
