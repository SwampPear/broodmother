/** A voice the vault carries: a folder under `personas/` whose PERSONA.md body joins the
 *  agent's system prompt when a dream's Claude node wears it. */
export interface Persona {
  name: string
  description: string
}

/** What the open vault's `personas/` folder carries; empty when no vault is open. */
export interface GetPersonas {
  request: null
  response: { personas: Persona[] }
}
