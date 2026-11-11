import type { ApiKey } from '@/api/types'
import type { Tone } from '@sub2api/ui'
import { quotaOf } from './keyLimits'
import { searchedPrefix } from './reveal'

/** What a key's status badge shows: its own switch, then expiry, then a used-up quota. */
export const KEY_STATES = ['active', 'disabled', 'expired', 'exhausted'] as const
export type KeyState = (typeof KEY_STATES)[number]

/** Past its expiry, from the instant of expiry on (as the gateway rejects it). */
export const isExpired = (k: ApiKey) => !!k.expires_at && new Date(k.expires_at).getTime() <= Date.now()

export function keyState(k: ApiKey): KeyState {
  if (k.status !== 'active') return 'disabled'
  if (isExpired(k)) return 'expired'
  return quotaOf(k).exhausted ? 'exhausted' : 'active'
}

/** Badge tones the generic status tones lack. */
export const KEY_STATE_TONES: Record<string, Tone> = { exhausted: 'danger' }

/** The status filter's choices (the server's `status` query values); it has none for a used-up quota. */
export const KEY_STATE_FILTERS = ['active', 'disabled', 'expired'] as const satisfies readonly KeyState[]

/** The list filters of GET /me/api-keys, as the page holds them ('' for none). */
export interface KeyFilters {
  q?: string
  status?: string
  group_id?: number | string | null
}

/**
 * Whether a key passes the list filters, read as the server reads them: q in
 * the name or starting the key prefix (searchedPrefix), a used-up quota being
 * no status of its own, the group exactly. A server from before the filters
 * ignores them and answers with every key, so what "select all results"
 * loads is narrowed with this before it is acted on.
 */
export function matchesKeyFilter(k: ApiKey, filters: KeyFilters) {
  const q = (filters.q ?? '').trim().toLowerCase()
  const prefix = searchedPrefix(q)
  if (q && !k.name.toLowerCase().includes(q) && !(prefix && k.key_prefix.toLowerCase().startsWith(prefix))) return false
  const state = keyState(k)
  if (filters.status && filters.status !== (state === 'exhausted' ? 'active' : state)) return false
  return filters.group_id == null || filters.group_id === '' || k.group_id === Number(filters.group_id)
}
