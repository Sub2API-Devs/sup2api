import type { Platform, PlatformEndpoint } from '@/api/types'

// What a group serves beyond the platforms of its accounts: the core converts
// between the four text protocols for every account type, with no opt-out
// (docs/CONVERT-MATRIX.md §0, §5.1), and estimates a token count itself when
// the upstream has no counting endpoint (§8). So accounts with any text
// endpoint also answer the text endpoints of every other platform.

/** Protocols a request is converted between. */
const TEXT = new Set(['anthropic.messages', 'openai.chat', 'openai.responses', 'gemini.generate', 'gemini.stream_generate'])
/** Token counts the core estimates for an upstream of another protocol. */
const COUNTED = new Set(['anthropic.count_tokens', 'gemini.count_tokens'])

export interface PlatformEndpoints {
  id: string
  endpoints: PlatformEndpoint[]
}

/**
 * The endpoints of the other platforms in `all` that accounts of the `own`
 * platforms serve through conversion; none when `own` has no text endpoint.
 */
export function convertedEndpoints(all: readonly Platform[], own: readonly PlatformEndpoints[]): PlatformEndpoints[] {
  if (!own.some(p => p.endpoints.some(e => TEXT.has(e.protocol)))) return []
  const ids = new Set(own.map(p => p.id))
  return all
    .filter(p => !ids.has(p.id))
    .map(p => ({ id: p.id, endpoints: p.endpoints.filter(e => TEXT.has(e.protocol) || COUNTED.has(e.protocol)) }))
    .filter(p => p.endpoints.length)
}
