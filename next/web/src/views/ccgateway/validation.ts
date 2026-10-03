export function isTrustedAuthorizationURL(value: string): boolean {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && ['claude.com','claude.ai','platform.claude.com','console.anthropic.com'].includes(url.host) } catch { return false }
}
export function sessionExpired(expiresAt: string, now = Date.now()): boolean {
  const expires = Date.parse(expiresAt)
  return !Number.isFinite(expires) || expires <= now
}
