import { rangeBounds, type RangeKey } from '@sub2api/ui'
import type { LocationQuery } from 'vue-router'

/** The search bar's starting filters: the range, and the fields it always sends. */
export function baseUsageFilters(range: RangeKey) {
  return {
    ...rangeBounds(range),
    model_contains: '',
    success: '',
    client_ip: '',
    // exact match on the client's X-Request-Id (CONTRACTS §14.4)
    client_request_id: ''
  }
}

const QUERY_FILTERS = ['user_id', 'group_name', 'model_contains', 'api_key_id', 'from', 'to'] as const

/** The filters a link presets (?user_id=…&from=…&to=…); a user cannot preset another user. */
export function queryUsageFilters(query: LocationQuery, admin: boolean): Record<string, string> {
  const out: Record<string, string> = {}
  for (const k of QUERY_FILTERS) {
    const v = query[k]
    if (typeof v === 'string' && v !== '' && (admin || (k !== 'user_id' && k !== 'group_name'))) out[k] = v
  }
  return out
}
