import type { Channel } from '../host'

// Channel form rules (CONTRACTS §72.14.6): the proxy is write-only (reads
// only return has_proxy); not sending it keeps it, "" clears it, and any
// change of it on a channel with a key needs the key again.

/** What an empty proxy field means on a channel that has one. */
export type EmptyProxy = 'keep' | 'clear'

const PROXY_RE = /^(https?|socks5):\/\/\S+$/i

export function validProxy(v: string): boolean {
  return PROXY_RE.test(v.trim())
}

/** The proxy field of the body: undefined = not sent (unchanged). */
export function proxyField(input: string, opts: { creating: boolean; hadProxy: boolean; empty: EmptyProxy }): string | undefined {
  const v = input.trim()
  if (v) return v
  if (opts.creating) return undefined
  return opts.hadProxy && opts.empty === 'clear' ? '' : undefined
}

/** A proxy change on a stored channel with a key needs the key again. */
export function proxyNeedsKey(proxy: string | undefined, opts: { creating: boolean; hasKey: boolean; newKey: string }): boolean {
  return !opts.creating && opts.hasKey && proxy !== undefined && !opts.newKey.trim()
}

/** PUT body of a stored channel with only `enabled` changed; the key and the proxy are not sent (kept). */
export function toggleBody(c: Channel, enabled: boolean): Record<string, unknown> {
  const body: Record<string, unknown> = {
    type: c.type,
    name: c.name,
    base_url: c.base_url,
    model: c.model,
    billing_model: c.billing_model || '',
    timeout_ms: c.timeout_ms,
    enabled
  }
  if (c.type === 'llm') body.protocol = c.protocol
  return body
}
