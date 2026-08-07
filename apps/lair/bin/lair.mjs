#!/usr/bin/env node

// The lair's errands, one authenticated fetch each. Configuration comes from the
// environment, never a file: LAIR_URL says where, LAIR_ADMIN_TOKEN (or LAIR_KEY for
// read-only asks) says who.

const usage = `lair — administer a broodmother lair

usage
  lair status                     version, uptime, sites, whether claude answers
  lair keys mint <name>           prints the key once; the lair keeps only a hash
  lair keys ls                    id, name, created — never the key
  lair keys revoke <id>
  lair sites add <name> <remote>  register a repository and clone it
  lair sites ls                   each site and how its last pull went
  lair key                        the lair's public deploy key, for your forge

environment
  LAIR_URL          where the lair listens, e.g. https://lair.example.com
  LAIR_ADMIN_TOKEN  the token printed at the lair's first boot
  LAIR_KEY          an access key, enough for everything but keys and sites add`

const url = process.env.LAIR_URL
const token = process.env.LAIR_ADMIN_TOKEN ?? process.env.LAIR_KEY

function fail(reason) {
  console.error(reason)
  process.exit(1)
}

async function ask(method, path, body) {
  if (!url) fail('set LAIR_URL to where the lair listens')
  if (!token) fail('set LAIR_ADMIN_TOKEN (or LAIR_KEY) to authenticate')
  const target = new URL(path, url)
  if (body && (method === 'GET' || method === 'DELETE'))
    for (const [key, value] of Object.entries(body)) target.searchParams.set(key, value)
  const withBody = body && method !== 'GET' && method !== 'DELETE'
  let response
  try {
    response = await fetch(target, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(withBody ? { 'content-type': 'application/json' } : {}),
      },
      body: withBody ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
    })
  } catch (error) {
    fail(`could not reach ${url} — ${error.message}`)
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) fail(payload.error ?? `the lair answered ${response.status}`)
  return payload
}

const when = (at) => new Date(at).toISOString().slice(0, 16).replace('T', ' ')

const [command, ...rest] = process.argv.slice(2)

if (command === 'status') {
  const status = await ask('GET', '/status')
  const hours = Math.floor(status.uptime / 3600)
  console.log(`version ${status.version}, up ${hours}h`)
  console.log(`${status.sites} site${status.sites === 1 ? '' : 's'}`)
  console.log(`claude ${status.claude ? 'ready' : 'missing — install the claude CLI'}`)
} else if (command === 'keys' && rest[0] === 'mint' && rest[1]) {
  const { grant } = await ask('POST', '/keys', { name: rest[1] })
  console.log(`${grant.id} minted for ${grant.name}. The key, shown this once:`)
  console.log(grant.key)
} else if (command === 'keys' && rest[0] === 'ls') {
  const { keys } = await ask('GET', '/keys')
  if (keys.length === 0) console.log('no keys yet — `lair keys mint <name>` makes one')
  for (const key of keys) console.log(`${key.id}  ${when(key.createdAt)}  ${key.name}`)
} else if (command === 'keys' && rest[0] === 'revoke' && rest[1]) {
  const { keys } = await ask('DELETE', '/keys', { id: rest[1] })
  console.log(`revoked. ${keys.length} key${keys.length === 1 ? '' : 's'} remain`)
} else if (command === 'sites' && rest[0] === 'add' && rest[1] && rest[2]) {
  const { site } = await ask('PUT', '/sites', { name: rest[1], remote: rest[2] })
  console.log(`${site.name} cloned from ${site.remote}`)
} else if (command === 'sites' && rest[0] === 'ls') {
  const { sites } = await ask('GET', '/sites')
  if (sites.length === 0)
    console.log('no sites yet — `lair sites add <name> <remote>` registers one')
  for (const site of sites)
    console.log(
      `${site.name}  ${site.remote}  pull ${site.pull}${site.message ? ` — ${site.message}` : ''}`,
    )
} else if (command === 'key') {
  const { publicKey } = await ask('GET', '/key')
  if (!publicKey) fail('the lair has no key — ssh-keygen failed at its first boot')
  console.log(publicKey)
} else {
  console.log(usage)
  process.exit(command ? 1 : 0)
}
