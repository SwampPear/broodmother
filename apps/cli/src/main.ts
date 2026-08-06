import { defaultRelay, HELP, parse } from './core'
import { invite, peers, runRelay, status } from './relay'
import { start } from './start'

const command = parse(process.argv.slice(2))

/** Starting the app and running a relay both hold the process open; everything else says one
 *  thing and leaves, with the exit code saying whether it worked. */
switch (command.kind) {
  case 'start':
    start(command.vault)
    break

  case 'relay':
    say(await runRelay())
    break

  case 'help':
    process.stdout.write(HELP)
    break

  case 'status':
    say(await status(command.relay ?? defaultRelay()))
    break

  case 'invite':
    say(invite(command.relay ?? defaultRelay()))
    break

  case 'peers':
    if (!command.invite) {
      say({ ok: false, text: `not an invite: ${command.text || '(nothing given)'}` })
      break
    }
    say(await peers(command.invite))
    break

  case 'unknown':
    say({ ok: false, text: `no such command: ${command.word}\n\n${HELP}` })
    break
}

function say({ text, ok }: { text: string; ok: boolean }): void {
  console[ok ? 'log' : 'error'](text)
  if (!ok) process.exitCode = 1
}
