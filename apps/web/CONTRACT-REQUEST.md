# Contract requests

Things the web app needs from `packages/shared` or the backend. `packages/shared` is
frozen, so these are requests, not changes.

## 1. The web app cannot build a `RoomId`

`RoomId` is documented as `${repoId}/${vaultPath}`, and nothing the web app can read tells
it what `repoId` is — `BroodmotherConfig` has no such field and `GET /api/config` returns only the
config. Right now `join` sends `room: path` and the app treats whatever `room` comes back on
`ServerMessage.session` as authoritative.

Either is fine:

- add `repoId: string` to `BroodmotherConfig` (or to the `GET /api/config` response), or
- let the server qualify the room itself — `ClientMessage.join` already carries `path`, so
  the server can ignore the client's `room` and echo the real `RoomId` back on the first
  `session` message.

The second needs no shared-types change and is what the app already assumes.

## 2. Request encoding for GET and DELETE is unstated

`ApiRoutes` gives each route a request type but not how it travels. The web app's HTTP
client (`src/api/http.ts`) sends:

- `GET` / `DELETE` — every field of the request type as a query-string parameter
  (`DELETE /api/doc?path=Handbook/Overview.md`)
- `POST` / `PUT` — the request type as a JSON body, `content-type: application/json`
- errors — non-2xx with an `ApiError` JSON body

If the backend picks something else, one of us changes; worth settling before both are wired.
