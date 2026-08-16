#!/usr/bin/env node
import { resolve } from 'node:path'
import { runLocalhost } from './localhost.mjs'

// `broodmother`, `broodmother <vault>` and `broodmother localhost [vault]` are the same
// run: the command name is there for the hand that expects one.
const args = process.argv.slice(2)
if (args[0] === 'localhost') args.shift()

// Only an explicit path pins the vault. Without one the server opens the vault it opened
// last — where you happen to be standing in the shell has nothing to do with it.
const override = args[0] ?? process.env.BROODMOTHER_VAULT
await runLocalhost(override ? resolve(override) : null)
