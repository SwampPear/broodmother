import type { ApiClient } from './client'
import { createMockClient } from './mock'

/** Swap for `httpClient()` from './http' once plan 04 is up on :3001. */
export const api: ApiClient = createMockClient()

export type { ApiClient, Connection } from './client'
