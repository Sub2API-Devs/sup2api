// Client-side parse of a proxy URL "scheme://user:pass@host:port", mirroring
// core proxy.ParseURL (CONTRACTS §21.4). The server is authoritative: the
// account editor only uses this for a shape hint, the proxies form to fill
// its fields.

export type ProxyProtocol = 'http' | 'https' | 'socks5'

export interface ProxySpec {
  protocol: ProxyProtocol
  host: string
  port: number
  username: string
  password: string
}

export type ProxyURLError = 'scheme' | 'host' | 'port' | 'extra' | 'invalid'

export type ProxyURLResult = { ok: true; spec: ProxySpec } | { ok: false; error: ProxyURLError }

const SCHEMES: Record<string, ProxyProtocol> = { http: 'http', https: 'https', socks5: 'socks5', socks5h: 'socks5' }

/** True when `raw` looks like "scheme://..." at all (used to decide whether to hint). */
export function looksLikeProxyURL(raw: string): boolean {
  return /^[a-z0-9+.-]+:\/\//i.test(raw.trim())
}

export function parseProxyURL(raw: string): ProxyURLResult {
  const s = raw.trim()
  const m = /^([a-z0-9+.-]+):\/\//i.exec(s)
  if (!m) return { ok: false, error: 'scheme' }
  const protocol = SCHEMES[m[1].toLowerCase()]
  if (!protocol) return { ok: false, error: 'scheme' }
  let u: URL
  try {
    // The URL parser knows the default port of http(s) only; parse under a
    // neutral scheme so the port is always explicit.
    u = new URL('proxy-url://' + s.slice(m[0].length))
  } catch {
    return { ok: false, error: 'invalid' }
  }
  if ((u.pathname && u.pathname !== '/') || u.search || u.hash) return { ok: false, error: 'extra' }
  // Hostname() of an IPv6 literal keeps the brackets in the URL API.
  const host = u.hostname.replace(/^\[(.*)\]$/, '$1')
  if (!host) return { ok: false, error: 'host' }
  const port = Number(u.port)
  if (!u.port || !Number.isInteger(port) || port < 1 || port > 65535) return { ok: false, error: 'port' }
  return {
    ok: true,
    spec: { protocol, host, port, username: decode(u.username), password: decode(u.password) }
  }
}

function decode(s: string): string {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}
