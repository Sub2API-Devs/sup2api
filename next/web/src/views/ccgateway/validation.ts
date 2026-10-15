export function isTrustedAuthorizationURL(value: string): boolean {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && ['claude.com','claude.ai','platform.claude.com','console.anthropic.com'].includes(url.host) } catch { return false }
}
export function sessionExpired(expiresAt: string, now = Date.now()): boolean {
  const expires = Date.parse(expiresAt)
  return !Number.isFinite(expires) || expires <= now
}
/** An authorization session the panel may show: an id, a trusted link, not expired. */
export function usableSession<T extends { session_id?: string; url: string; expires_at: string }>(s: T | null | undefined): s is T {
  return !!s?.session_id && isTrustedAuthorizationURL(s.url) && !sessionExpired(s.expires_at)
}
