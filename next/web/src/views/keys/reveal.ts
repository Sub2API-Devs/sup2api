import { api } from '@sub2api/host'

/** The full key of the caller's API key (audited as apikey.reveal). */
export const revealKey = async (id: number) => (await api.post<{ key: string }>(`/me/api-keys/${id}/reveal`, {})).key

/** A key as its prefix and a mask, the way lists show it. */
export const maskKey = (prefix: string) => `${prefix}${'*'.repeat(6)}`

/** How much of a key the server keeps readable (its key_prefix). */
const KEY_PREFIX_LENGTH = 12
/** A key, or the start of one, wherever it stands in a text: the fixed scheme, then letters and digits. */
const KEY_IN_TEXT = /sk-s2a-[0-9a-z]+/i

/**
 * The `q` to send for what was typed in the search box. Text that holds a key
 * (bare, quoted, after "Bearer " or "KEY=", in either case) is sent as that
 * key's prefix alone, which is all the server matches of a key: the secret
 * part never travels in a query string, and so into access logs.
 */
export function searchQuery(text: string) {
  const key = KEY_IN_TEXT.exec(text)
  return key ? key[0].slice(0, KEY_PREFIX_LENGTH) : text.trim()
}

/**
 * The key prefix a `q` asks for besides the name, as the server reads it
 * (lowercased): only text that starts as a key and says more than the scheme
 * every key starts with.
 */
export const searchedPrefix = (q: string) => (/^sk-s2a-./i.test(q) ? q.slice(0, KEY_PREFIX_LENGTH).toLowerCase() : '')
