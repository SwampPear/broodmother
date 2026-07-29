# Contract requests — plan 03

No changes to `packages/shared` are needed. Two notes for whoever owns the other half.

## 1. The relay must send `session` on every membership change (plan 04)

The seed-vs-adopt decision reads exactly one thing: the peer list in the first
`{ type: 'session', room, peers }` the joiner receives after its `join`. Empty (once our own
id is filtered out) means we are first and seed the room from our file; non-empty means we
adopt. So the relay must:

- reply to `join` with a `session` message carrying the room's current members, **including
  the joiner**, and
- broadcast the same message to every member of the room whenever someone joins or leaves.

The second half is what makes an existing client send the newcomer the room's document —
without it a joiner adopts an empty room. Membership is also what prunes ghost cursors, so
a client that drops off must disappear from the list.

`session.state` on that message is ignored: `solo`/`divergent` are per-client facts the
relay cannot know, and the client owns its own state machine.

## 2. `divergence` as a `ServerMessage` is unused

Divergence is decided on the client, by comparing the room's markdown against the joiner's
own file — the relay never touches disk and cannot make that comparison. The session
ignores an inbound `{ type: 'divergence' }`. Worth deleting from `api.ts` if nothing else
claims it.
